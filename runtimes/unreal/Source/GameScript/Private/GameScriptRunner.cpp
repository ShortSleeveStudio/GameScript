#include "GameScriptRunner.h"
#include "GameScriptDatabase.h"
#include "GameScriptSettings.h"
#include "JumpTableBuilder.h"
#include "RunnerContext.h"
#include "GSCompletionHandle.h"
#include "GameScript.h"
#include "CldrPluralRules.h"
#include "VariantResolver.h"
#include "Iso4217.h"
#include "Generated/snapshot_generated.h"
#include "Internationalization/Internationalization.h"
#include "Internationalization/Culture.h"
#include "GameFramework/Actor.h"
#include "GameplayTasksComponent.h"

UGameScriptRunner::UGameScriptRunner()
{
	// Default constructor (UObject requirement)
}

void UGameScriptRunner::Initialize(UGameScriptDatabase* InDatabase, UGameScriptSettings* InSettings)
{
	check(InDatabase);

	Database = InDatabase;
	Settings = InSettings;

	// Use default settings if none provided
	if (!Settings)
	{
		Settings = GetMutableDefault<UGameScriptSettings>();
	}

	// Build jump tables from global registrations
	BuildJumpTables();

	// Subscribe to locale changes to invalidate caches
	Database->OnLocaleChanged.AddDynamic(this, &UGameScriptRunner::OnLocaleChanged);

	// Pre-allocate context pool
	int32 PoolSize = Settings->MaxConcurrentConversations;
	ContextPool.Reserve(PoolSize);
	ActiveContexts.Reserve(PoolSize);
}

FActiveConversation UGameScriptRunner::StartConversation(
	int32 ConversationId,
	TScriptInterface<IGameScriptListener> Listener,
	AActor* TaskOwner)
{
	if (!Listener.GetObject())
	{
		UE_LOG(LogGameScript, Error, TEXT("StartConversation failed - Listener is null"));
		return FActiveConversation();
	}

	if (!TaskOwner)
	{
		UE_LOG(LogGameScript, Error, TEXT("StartConversation failed - TaskOwner is null"));
		return FActiveConversation();
	}

	// Find conversation in database
	FConversationRef Conv = Database->FindConversation(ConversationId);
	if (!Conv.IsValid())
	{
		UE_LOG(LogGameScript, Error, TEXT("StartConversation failed - Conversation %d not found"), ConversationId);
		return FActiveConversation();
	}

	// Ensure TaskOwner has a UGameplayTasksComponent
	UGameplayTasksComponent* TasksComponent = TaskOwner->FindComponentByClass<UGameplayTasksComponent>();
	if (!TasksComponent)
	{
		// Add component dynamically if not present
		TasksComponent = NewObject<UGameplayTasksComponent>(TaskOwner, NAME_None, RF_Transient);
		TasksComponent->RegisterComponent();
	}

	// Acquire context from pool
	URunnerContext* Context = AcquireContext();
	if (!Context)
	{
		UE_LOG(LogGameScript, Error, TEXT("Failed to acquire context - pool exhausted"));
		return FActiveConversation();
	}

	// Initialize context (increments its own sequence counter)
	Context->Initialize(this, ConversationId, Listener, TasksComponent);

	// Get context ID and sequence for the handle
	int32 ContextId = Context->GetContextId();
	int32 Sequence = Context->GetSequence();

	// Start execution
	Context->Start();

	return FActiveConversation(ContextId, Sequence);
}

void UGameScriptRunner::StopConversation(FActiveConversation Handle)
{
	URunnerContext* Context = ValidateHandle(Handle);
	if (!Context)
	{
		return;
	}

	// Cancel the context - it will release itself via EnterCleanup
	// Don't call ReleaseContext here to avoid double-release
	Context->Cancel();
}

void UGameScriptRunner::StopAllConversations()
{
	// Collect context IDs first to avoid modifying map during iteration
	TArray<int32> ContextIds;
	ContextIds.Reserve(ActiveContexts.Num());
	for (const auto& Pair : ActiveContexts)
	{
		ContextIds.Add(Pair.Key);
	}

	// Cancel each context (Cancel() calls ReleaseContext() which removes from ActiveContexts)
	for (int32 ContextId : ContextIds)
	{
		if (TObjectPtr<URunnerContext>* ContextPtr = ActiveContexts.Find(ContextId))
		{
			URunnerContext* Context = *ContextPtr;
			if (Context && Context->IsActive())
			{
				Context->Cancel();
			}
		}
	}
}

bool UGameScriptRunner::IsActive(FActiveConversation Handle) const
{
	URunnerContext* Context = ValidateHandle(Handle);
	if (!Context)
	{
		return false;
	}

	return Context->IsActive();
}

URunnerContext* UGameScriptRunner::ValidateHandle(FActiveConversation Handle) const
{
	// Check handle validity
	if (!Handle.IsValid())
	{
		return nullptr;
	}

	// O(1) lookup by ContextId
	const TObjectPtr<URunnerContext>* ContextPtr = ActiveContexts.Find(Handle.ContextId);
	if (!ContextPtr)
	{
		return nullptr;
	}

	URunnerContext* Context = *ContextPtr;

	// Validate sequence to detect stale handles after context reuse
	if (!Context || Context->GetSequence() != Handle.Sequence)
	{
		return nullptr;
	}

	return Context;
}

URunnerContext* UGameScriptRunner::AcquireContext()
{
	URunnerContext* Context = nullptr;

	// Try to reuse from pool (O(1) pop from end)
	if (ContextPool.Num() > 0)
	{
		Context = ContextPool.Pop();
	}
	else
	{
		// Create new context with this runner as outer for proper GC
		Context = NewObject<URunnerContext>(this);
	}

	// Add to active map using context's unique ID (O(1) insert)
	ActiveContexts.Add(Context->GetContextId(), Context);
	return Context;
}

void UGameScriptRunner::ReleaseContext(URunnerContext* Context)
{
	if (!Context)
	{
		return;
	}

	// Remove from active map (O(1) removal)
	ActiveContexts.Remove(Context->GetContextId());

	// Return to pool (O(1) push to end)
	ContextPool.Add(Context);
}

UGSCompletionHandle* UGameScriptRunner::AcquireHandle()
{
	if (HandlePool.Num() > 0)
	{
		return HandlePool.Pop();
	}
	return NewObject<UGSCompletionHandle>(this);
}

void UGameScriptRunner::ReleaseHandle(UGSCompletionHandle* Handle)
{
	if (Handle)
	{
		Handle->Invalidate();
		HandlePool.Add(Handle);
	}
}

void UGameScriptRunner::BuildJumpTables()
{
	FJumpTableBuilder::BuildJumpTables(Database, Conditions, Actions);

	// Validate jump tables in development builds
#if !UE_BUILD_SHIPPING
	if (!FJumpTableBuilder::ValidateJumpTables(Database, Conditions, Actions))
	{
		UE_LOG(LogGameScript, Warning,
			TEXT("Jump table validation failed - some nodes may not execute properly. See log for details."));
	}
#endif
}

// ---------------------------------------------------------------------------
// Text Resolution
// ---------------------------------------------------------------------------

FString UGameScriptRunner::ResolveText(int32 LocalizationIdx, FNodeRef Node, const FTextResolutionParams& Parms)
{
	if (LocalizationIdx < 0)
	{
		return FString();
	}

	const GameScript::Snapshot* Snap = Database->GetSnapshot();
	const GameScript::Localization* Loc = Snap->localizations()->Get(LocalizationIdx);

	// 1. Resolve gender
	EGSGenderCategory Gender = ResolveGender(Loc, Parms, Snap);

	// 2. Resolve plural category (cardinal or ordinal based on PluralArg.Type)
	EGSPluralCategory Plural = EGSPluralCategory::Other;
	if (Parms.bHasPlural)
	{
		EnsureCldrRulesCached(Snap);
		if (Parms.Plural.Type == EGSPluralType::Ordinal)
		{
			// Ordinal rules are integer-only; clamp int64 to int32
			int32 OrdinalN = static_cast<int32>(FMath::Clamp(Parms.Plural.Value, (int64)INT32_MIN, (int64)INT32_MAX));
			Plural = FCldrPluralRules::ApplyOrdinalRule(CachedOrdinalRuleIdx, OrdinalN);
		}
		else
		{
			Plural = FCldrPluralRules::ApplyRule(CachedCardinalRuleIdx, Parms.Plural.Value, Parms.Plural.Precision);
		}
	}

	// 3. Select variant
	FString Text = FVariantResolver::Resolve(Loc, Gender, Plural);
	if (Text.IsEmpty())
	{
		return FString();
	}

	// 4. Template substitution — only when is_templated is set and there are args
	bool bHasPlural = Parms.bHasPlural;
	bool bHasArgs = Parms.Args.Num() > 0;
	if (Loc->is_templated() && (bHasPlural || bHasArgs))
	{
		Text = ApplyTemplate(Text, Parms);
	}

	return Text;
}

EGSGenderCategory UGameScriptRunner::ResolveGender(
	const GameScript::Localization* Loc,
	const FTextResolutionParams& Parms,
	const GameScript::Snapshot* Snapshot)
{
	// Caller-supplied override always wins
	if (Parms.bHasGenderOverride)
	{
		return Parms.GenderOverride;
	}

	// Derive from subject actor's grammatical gender (subject_actor takes precedence)
	int32 ActorIdx = Loc->subject_actor_idx();
	if (ActorIdx >= 0)
	{
		GameScript::GrammaticalGender GG = Snapshot->actors()->Get(ActorIdx)->grammatical_gender();
		switch (GG)
		{
			case GameScript::GrammaticalGender_Masculine: return EGSGenderCategory::Masculine;
			case GameScript::GrammaticalGender_Feminine:  return EGSGenderCategory::Feminine;
			case GameScript::GrammaticalGender_Neuter:    return EGSGenderCategory::Neuter;
			default:                                      return EGSGenderCategory::Other; // Other + Dynamic
		}
	}

	// Fall back to direct gender override (GenderCategory::Other when unset)
	return static_cast<EGSGenderCategory>(Loc->subject_gender());
}

FString UGameScriptRunner::ApplyTemplate(const FString& Text, const FTextResolutionParams& Parms)
{
	SharedStringBuilder.Reset();

	const TCHAR* Data = *Text;
	int32 Len = Text.Len();
	int32 i = 0;

	while (i < Len)
	{
		TCHAR C = Data[i];

		if (C == TEXT('{'))
		{
			// Escaped brace: {{ -> '{'
			if (i + 1 < Len && Data[i + 1] == TEXT('{'))
			{
				SharedStringBuilder.AppendChar(TEXT('{'));
				i += 2;
				continue;
			}

			// Scan for matching '}'
			int32 Start = i + 1;
			int32 End = Start;
			while (End < Len && Data[End] != TEXT('}'))
			{
				End++;
			}

			if (End >= Len)
			{
				// Malformed — no closing brace; emit rest of string literally
				SharedStringBuilder.Append(Data + i, Len - i);
				break;
			}

			FString Placeholder(End - Start, Data + Start);

			// Try PluralArg first (formatted as locale-aware number)
			bool bResolved = false;
			if (Parms.bHasPlural && Parms.Plural.Name.Equals(Placeholder, ESearchCase::CaseSensitive))
			{
				if (Parms.Plural.Precision > 0)
				{
					// Decimal: format with Precision decimal places
					double DisplayValue = static_cast<double>(Parms.Plural.Value) / Pow10(Parms.Plural.Precision);
					FNumberFormattingOptions Opts;
					Opts.SetMaximumFractionalDigits(Parms.Plural.Precision);
					Opts.SetMinimumFractionalDigits(Parms.Plural.Precision);
					SharedStringBuilder.Append(FText::AsNumber(DisplayValue, &Opts, GetCulture()).ToString());
				}
				else
				{
					// Integer: grouped integer formatting
					FNumberFormattingOptions Opts;
					Opts.SetMaximumFractionalDigits(0);
					Opts.SetMinimumFractionalDigits(0);
					SharedStringBuilder.Append(FText::AsNumber(Parms.Plural.Value, &Opts, GetCulture()).ToString());
				}
				bResolved = true;
			}

			// Try typed Args
			if (!bResolved)
			{
				for (int32 A = 0; A < Parms.Args.Num(); A++)
				{
					if (Parms.Args[A].Name.Equals(Placeholder, ESearchCase::CaseSensitive))
					{
						FString Formatted;
						FormatArg(Parms.Args[A], Formatted);
						SharedStringBuilder.Append(Formatted);
						bResolved = true;
						break;
					}
				}
			}

			// Unknown placeholder — pass through unchanged
			if (!bResolved)
			{
				SharedStringBuilder.AppendChar(TEXT('{'));
				SharedStringBuilder.Append(Placeholder);
				SharedStringBuilder.AppendChar(TEXT('}'));
			}

			i = End + 1; // skip past '}'
		}
		else if (C == TEXT('}'))
		{
			// Escaped brace: }} -> '}'
			if (i + 1 < Len && Data[i + 1] == TEXT('}'))
			{
				SharedStringBuilder.AppendChar(TEXT('}'));
				i += 2;
			}
			else
			{
				// Lone '}' — emit literally (lenient)
				SharedStringBuilder.AppendChar(TEXT('}'));
				i++;
			}
		}
		else
		{
			SharedStringBuilder.AppendChar(C);
			i++;
		}
	}

	return SharedStringBuilder;
}

void UGameScriptRunner::FormatArg(const FGSArg& Arg, FString& OutResult)
{
	switch (Arg.Type)
	{
		case EGSArgType::String:
		{
			OutResult = Arg.StringValue;
			break;
		}

		case EGSArgType::Int:
		{
			FNumberFormattingOptions Opts;
			Opts.SetMaximumFractionalDigits(0);
			Opts.SetMinimumFractionalDigits(0);
			OutResult = FText::AsNumber(Arg.NumericValue, &Opts, GetCulture()).ToString();
			break;
		}

		case EGSArgType::Decimal:
		{
			double Value = static_cast<double>(Arg.NumericValue) / Pow10(Arg.Precision);
			FNumberFormattingOptions Opts;
			Opts.SetMaximumFractionalDigits(Arg.Precision);
			Opts.SetMinimumFractionalDigits(Arg.Precision);
			OutResult = FText::AsNumber(Value, &Opts, GetCulture()).ToString();
			break;
		}

		case EGSArgType::Percent:
		{
			// Value is percentage x 10^precision (e.g., 155 with precision 1 = 15.5%)
			// Divide by 10^precision to get the percentage, then by 100 for fractional form
			double Pct = static_cast<double>(Arg.NumericValue) / Pow10(Arg.Precision) / 100.0;
			FNumberFormattingOptions Opts;
			Opts.SetMaximumFractionalDigits(Arg.Precision);
			Opts.SetMinimumFractionalDigits(Arg.Precision);
			OutResult = FText::AsPercent(Pct, &Opts, GetCulture()).ToString();
			break;
		}

		case EGSArgType::Currency:
		{
			int32 Decimals = FIso4217::GetMinorUnitDigits(Arg.CurrencyCode);
			double Value = static_cast<double>(Arg.NumericValue) / Pow10(Decimals);
			FString Symbol = FIso4217::GetSymbol(Arg.CurrencyCode, CachedLocaleName);
			FNumberFormattingOptions Opts;
			Opts.SetMaximumFractionalDigits(Decimals);
			Opts.SetMinimumFractionalDigits(Decimals);
			OutResult = FText::AsCurrencyBase(Arg.NumericValue, Arg.CurrencyCode, GetCulture()).ToString();
			break;
		}

		case EGSArgType::RawInt:
		{
			OutResult = FString::Printf(TEXT("%lld"), Arg.NumericValue);
			break;
		}
	}
}

FCulturePtr UGameScriptRunner::GetCulture()
{
	if (CachedCulture.IsValid())
	{
		return CachedCulture;
	}

	const GameScript::Snapshot* Snap = Database->GetSnapshot();
	if (!Snap || !Snap->locale_name())
	{
		CachedCulture = FInternationalization::Get().GetDefaultCulture();
		return CachedCulture;
	}

	CachedLocaleName = FString(UTF8_TO_TCHAR(Snap->locale_name()->c_str()));
	// Normalize underscore to hyphen for ICU
	FString Normalized = CachedLocaleName.Replace(TEXT("_"), TEXT("-"));
	CachedCulture = FInternationalization::Get().GetCulture(Normalized);
	if (!CachedCulture.IsValid())
	{
		CachedCulture = FInternationalization::Get().GetDefaultCulture();
	}

	return CachedCulture;
}

void UGameScriptRunner::EnsureCldrRulesCached(const GameScript::Snapshot* Snapshot)
{
	if (bCldrRulesCached)
	{
		return;
	}

	FString LocaleName;
	if (Snapshot && Snapshot->locale_name())
	{
		LocaleName = FString(UTF8_TO_TCHAR(Snapshot->locale_name()->c_str()));
	}

	CachedCardinalRuleIdx = FCldrPluralRules::LookupCardinalRule(LocaleName);
	CachedOrdinalRuleIdx = FCldrPluralRules::LookupOrdinalRule(LocaleName);
	bCldrRulesCached = true;
}

void UGameScriptRunner::OnLocaleChanged()
{
	CachedCulture.Reset();
	CachedLocaleName.Empty();
	bCldrRulesCached = false;
}

double UGameScriptRunner::Pow10(int32 Exponent)
{
	switch (Exponent)
	{
		case 0: return 1.0;
		case 1: return 10.0;
		case 2: return 100.0;
		case 3: return 1000.0;
		case 4: return 10000.0;
		case 5: return 100000.0;
		case 6: return 1000000.0;
		default: return FMath::Pow(10.0, static_cast<double>(Exponent));
	}
}
