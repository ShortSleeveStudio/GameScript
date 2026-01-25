#include "GameScriptManifest.h"
#include "GameScriptDatabase.h"
#include "GameScriptRunner.h"
#include "GameScriptSettings.h"
#include "GameScript.h"
#include "Misc/Paths.h"

void UGameScriptManifest::Initialize(
	const FString& InBasePath,
	const TArray<FManifestLocale>& InLocales,
	int32 InPrimaryLocaleIndex)
{
	BasePath = InBasePath;
	Locales = InLocales;
	PrimaryLocaleIndex = InPrimaryLocaleIndex;
}

const FManifestLocale& UGameScriptManifest::GetLocaleMetadata(int32 Index) const
{
	static FManifestLocale InvalidLocale;
	if (Index < 0 || Index >= Locales.Num())
	{
		return InvalidLocale;
	}
	return Locales[Index];
}

UGameScriptDatabase* UGameScriptManifest::LoadDatabase(FLocaleRef Locale)
{
	if (!Locale.IsValid())
	{
		UE_LOG(LogGameScript, Error, TEXT("Invalid locale ref"));
		return nullptr;
	}

	// Get locale metadata
	const FManifestLocale& LocaleMetadata = GetLocaleMetadata(Locale.Index);
	if (LocaleMetadata.Id < 0)
	{
		UE_LOG(LogGameScript, Error, TEXT("Locale not found in manifest"));
		return nullptr;
	}

	// Build snapshot path (using locale name, matching Unity's convention)
	FString SnapshotPath = FPaths::Combine(BasePath, TEXT("locales"), LocaleMetadata.Name + TEXT(".gsb"));

	// Create and load database
	UGameScriptDatabase* Database = NewObject<UGameScriptDatabase>();
	if (!Database->LoadSnapshot(SnapshotPath))
	{
		UE_LOG(LogGameScript, Error, TEXT("Failed to load snapshot at %s"), *SnapshotPath);
		return nullptr;
	}

	// Store manifest, base path, and locale index for locale switching and GetCurrentLocale()
	Database->SetManifestAndBasePath(this, BasePath);
	Database->SetCurrentLocaleIndex(Locale.Index);

	return Database;
}

UGameScriptRunner* UGameScriptManifest::CreateRunner(FLocaleRef Locale, UGameScriptSettings* Settings)
{
	UGameScriptDatabase* Database = LoadDatabase(Locale);
	if (!Database)
	{
		return nullptr;
	}

	// Create runner as UObject (using this manifest as outer for proper ownership)
	UGameScriptRunner* Runner = NewObject<UGameScriptRunner>(this);
	Runner->Initialize(Database, Settings);
	return Runner;
}

UGameScriptRunner* UGameScriptManifest::CreateRunnerWithPrimaryLocale(UGameScriptSettings* Settings)
{
	FLocaleRef PrimaryLocale = GetPrimaryLocale();
	return CreateRunner(PrimaryLocale, Settings);
}

FLocaleRef UGameScriptManifest::GetPrimaryLocale() const
{
	if (PrimaryLocaleIndex < 0 || PrimaryLocaleIndex >= Locales.Num())
	{
		UE_LOG(LogGameScript, Warning, TEXT("Invalid primary locale index"));
		return FLocaleRef();
	}

	return FLocaleRef(this, PrimaryLocaleIndex);
}

FLocaleRef UGameScriptManifest::GetLocale(int32 Index) const
{
	if (Index < 0 || Index >= Locales.Num())
	{
		return FLocaleRef();
	}

	return FLocaleRef(this, Index);
}

bool UGameScriptManifest::TryFindLocale(int32 LocaleId, FLocaleRef& OutLocale) const
{
	for (int32 i = 0; i < Locales.Num(); ++i)
	{
		if (Locales[i].Id == LocaleId)
		{
			OutLocale = FLocaleRef(this, i);
			return true;
		}
	}

	return false;
}
