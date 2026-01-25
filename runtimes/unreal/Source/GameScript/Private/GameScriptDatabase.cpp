#include "GameScriptDatabase.h"
#include "GameScript.h"
#include "GameScriptManifest.h"
#include "Misc/FileHelper.h"
#include "Misc/Paths.h"
#include "Generated/snapshot.h"

UGameScriptDatabase::UGameScriptDatabase()
{
}

UGameScriptDatabase::~UGameScriptDatabase()
{
	// FlatBuffers snapshot pointer is just a cast into SnapshotBuffer
	// No explicit cleanup needed
}

bool UGameScriptDatabase::LoadSnapshot(const FString& SnapshotPath)
{
	// Load into temporary buffer first to preserve current state on failure
	TArray<uint8> TempBuffer;
	if (!FFileHelper::LoadFileToArray(TempBuffer, *SnapshotPath))
	{
		UE_LOG(LogGameScript, Error, TEXT("Failed to read snapshot file: %s"), *SnapshotPath);
		return false;
	}

	// Verify before committing
	flatbuffers::Verifier Verifier(TempBuffer.GetData(), TempBuffer.Num());
	if (!GameScript::VerifySnapshotBuffer(Verifier))
	{
		UE_LOG(LogGameScript, Error, TEXT("Snapshot verification failed: %s"), *SnapshotPath);
		return false;
	}

	// Verification passed - now commit the change
	// Invalidate old snapshot pointer first (it points into old buffer)
	Snapshot = nullptr;

	// Move temp buffer to member (efficient, no copy)
	SnapshotBuffer = MoveTemp(TempBuffer);

	// Set new snapshot pointer
	Snapshot = GameScript::GetSnapshot(SnapshotBuffer.GetData());
	CurrentSnapshotPath = SnapshotPath;

	// Build ID-to-index maps for fast lookups
	BuildIdMaps();

	return true;
}

FLocaleRef UGameScriptDatabase::GetCurrentLocale() const
{
	if (!Manifest.IsValid() || CurrentLocaleIndex < 0)
	{
		return FLocaleRef();
	}
	return FLocaleRef(Manifest.Get(), CurrentLocaleIndex);
}

bool UGameScriptDatabase::ChangeLocale(FLocaleRef NewLocale)
{
	// Ensure we're on the game thread for safety
	check(IsInGameThread());

	if (!NewLocale.IsValid())
	{
		UE_LOG(LogGameScript, Error, TEXT("Cannot change locale - invalid locale ref"));
		return false;
	}

	// Ensure we have a manifest reference
	if (!Manifest.IsValid())
	{
		UE_LOG(LogGameScript, Error, TEXT("Cannot change locale - no manifest reference. Database was not created via Manifest->LoadDatabase()"));
		return false;
	}

	if (BasePath.IsEmpty())
	{
		UE_LOG(LogGameScript, Error, TEXT("Cannot change locale - no base path set"));
		return false;
	}

	// Get locale metadata from manifest
	UGameScriptManifest* ManifestPtr = Manifest.Get();
	if (!ManifestPtr)
	{
		UE_LOG(LogGameScript, Error, TEXT("Cannot change locale - manifest was garbage collected"));
		return false;
	}
	const FManifestLocale& LocaleMetadata = ManifestPtr->GetLocaleMetadata(NewLocale.Index);
	if (LocaleMetadata.Id < 0)
	{
		UE_LOG(LogGameScript, Error, TEXT("Cannot change locale - locale not found in manifest"));
		return false;
	}

	// Build snapshot path (using locale Name to match how snapshots are exported)
	FString NewSnapshotPath = FPaths::Combine(BasePath, TEXT("locales"), LocaleMetadata.Name + TEXT(".gsb"));

	UE_LOG(LogGameScript, Log, TEXT("Attempting to change locale to %s (index %d, id %d) at path: %s"),
		*LocaleMetadata.Name, NewLocale.Index, LocaleMetadata.Id, *NewSnapshotPath);

	// Check if file exists before attempting to load
	if (!FPaths::FileExists(NewSnapshotPath))
	{
		UE_LOG(LogGameScript, Error, TEXT("Snapshot file does not exist at path: %s"), *NewSnapshotPath);
		return false;
	}

	// Load new snapshot
	if (!LoadSnapshot(NewSnapshotPath))
	{
		UE_LOG(LogGameScript, Error, TEXT("Failed to load snapshot for locale %s at %s"), *LocaleMetadata.Name, *NewSnapshotPath);
		return false;
	}

	UE_LOG(LogGameScript, Log, TEXT("Successfully changed locale to %s (%d)"), *LocaleMetadata.Name, LocaleMetadata.Id);

	// Track current locale index
	CurrentLocaleIndex = NewLocale.Index;

	// Note: ID maps are automatically rebuilt by LoadSnapshot() -> BuildIdMaps()
	// Broadcast locale change event
	OnLocaleChanged.Broadcast();

	return true;
}

// --- DRY: GetCount() methods use template helper ---

int32 UGameScriptDatabase::GetNodeCount() const
{
	return GetCollectionCount(&GameScript::Snapshot::nodes);
}

int32 UGameScriptDatabase::GetConversationCount() const
{
	return GetCollectionCount(&GameScript::Snapshot::conversations);
}

int32 UGameScriptDatabase::GetActorCount() const
{
	return GetCollectionCount(&GameScript::Snapshot::actors);
}

int32 UGameScriptDatabase::GetLocalizationCount() const
{
	return GetCollectionCount(&GameScript::Snapshot::localizations);
}

int32 UGameScriptDatabase::GetEdgeCount() const
{
	return GetCollectionCount(&GameScript::Snapshot::edges);
}

int32 UGameScriptDatabase::GetPropertyTemplateCount() const
{
	return GetCollectionCount(&GameScript::Snapshot::property_templates);
}

// --- DRY: FindEntity() methods use template helper ---

FNodeRef UGameScriptDatabase::FindNode(int32 NodeId) const
{
	return FindEntityById<FNodeRef>(NodeIdToIndex, NodeId);
}

FConversationRef UGameScriptDatabase::FindConversation(int32 ConversationId) const
{
	return FindEntityById<FConversationRef>(ConversationIdToIndex, ConversationId);
}

FActorRef UGameScriptDatabase::FindActor(int32 ActorId) const
{
	return FindEntityById<FActorRef>(ActorIdToIndex, ActorId);
}

FLocalizationRef UGameScriptDatabase::FindLocalization(int32 LocalizationId) const
{
	return FindEntityById<FLocalizationRef>(LocalizationIdToIndex, LocalizationId);
}

FEdgeRef UGameScriptDatabase::FindEdge(int32 EdgeId) const
{
	return FindEntityById<FEdgeRef>(EdgeIdToIndex, EdgeId);
}

FPropertyTemplateRef UGameScriptDatabase::FindPropertyTemplate(int32 TemplateId) const
{
	return FindEntityById<FPropertyTemplateRef>(PropertyTemplateIdToIndex, TemplateId);
}

// --- Checked Lookups (log error if not found) ---

FNodeRef UGameScriptDatabase::FindNodeChecked(int32 NodeId) const
{
	FNodeRef Ref = FindNode(NodeId);
	if (!Ref.IsValid())
	{
		UE_LOG(LogGameScript, Error, TEXT("FindNodeChecked: Node with ID %d not found"), NodeId);
	}
	return Ref;
}

FConversationRef UGameScriptDatabase::FindConversationChecked(int32 ConversationId) const
{
	FConversationRef Ref = FindConversation(ConversationId);
	if (!Ref.IsValid())
	{
		UE_LOG(LogGameScript, Error, TEXT("FindConversationChecked: Conversation with ID %d not found"), ConversationId);
	}
	return Ref;
}

FActorRef UGameScriptDatabase::FindActorChecked(int32 ActorId) const
{
	FActorRef Ref = FindActor(ActorId);
	if (!Ref.IsValid())
	{
		UE_LOG(LogGameScript, Error, TEXT("FindActorChecked: Actor with ID %d not found"), ActorId);
	}
	return Ref;
}

FLocalizationRef UGameScriptDatabase::FindLocalizationChecked(int32 LocalizationId) const
{
	FLocalizationRef Ref = FindLocalization(LocalizationId);
	if (!Ref.IsValid())
	{
		UE_LOG(LogGameScript, Error, TEXT("FindLocalizationChecked: Localization with ID %d not found"), LocalizationId);
	}
	return Ref;
}

FEdgeRef UGameScriptDatabase::FindEdgeChecked(int32 EdgeId) const
{
	FEdgeRef Ref = FindEdge(EdgeId);
	if (!Ref.IsValid())
	{
		UE_LOG(LogGameScript, Error, TEXT("FindEdgeChecked: Edge with ID %d not found"), EdgeId);
	}
	return Ref;
}

FPropertyTemplateRef UGameScriptDatabase::FindPropertyTemplateChecked(int32 TemplateId) const
{
	FPropertyTemplateRef Ref = FindPropertyTemplate(TemplateId);
	if (!Ref.IsValid())
	{
		UE_LOG(LogGameScript, Error, TEXT("FindPropertyTemplateChecked: PropertyTemplate with ID %d not found"), TemplateId);
	}
	return Ref;
}

// --- DRY: GetByIndex() methods use template helper ---

FNodeRef UGameScriptDatabase::GetNodeByIndex(int32 Index) const
{
	return GetEntityByIndex<FNodeRef>(Index, [this]() { return GetNodeCount(); });
}

FConversationRef UGameScriptDatabase::GetConversationByIndex(int32 Index) const
{
	return GetEntityByIndex<FConversationRef>(Index, [this]() { return GetConversationCount(); });
}

FActorRef UGameScriptDatabase::GetActorByIndex(int32 Index) const
{
	return GetEntityByIndex<FActorRef>(Index, [this]() { return GetActorCount(); });
}

FLocalizationRef UGameScriptDatabase::GetLocalizationByIndex(int32 Index) const
{
	return GetEntityByIndex<FLocalizationRef>(Index, [this]() { return GetLocalizationCount(); });
}

FEdgeRef UGameScriptDatabase::GetEdgeByIndex(int32 Index) const
{
	return GetEntityByIndex<FEdgeRef>(Index, [this]() { return GetEdgeCount(); });
}

FPropertyTemplateRef UGameScriptDatabase::GetPropertyTemplateByIndex(int32 Index) const
{
	return GetEntityByIndex<FPropertyTemplateRef>(Index, [this]() { return GetPropertyTemplateCount(); });
}

void UGameScriptDatabase::BuildIdMaps()
{
	// Clear all maps first (critical for locale switching - prevents stale entries)
	NodeIdToIndex.Empty();
	ConversationIdToIndex.Empty();
	ActorIdToIndex.Empty();
	LocalizationIdToIndex.Empty();
	EdgeIdToIndex.Empty();
	PropertyTemplateIdToIndex.Empty();

	if (!Snapshot)
	{
		return;
	}

	// Helper lambda to build ID maps (eliminates code duplication)
	auto BuildIdMap = [](const auto* Entities, TMap<int32, int32>& OutMap)
	{
		if (!Entities)
		{
			return;
		}
		OutMap.Reserve(Entities->size());
		for (int32 i = 0; i < static_cast<int32>(Entities->size()); ++i)
		{
			OutMap.Add(Entities->Get(i)->id(), i);
		}
	};

	// Build all ID to index maps
	BuildIdMap(Snapshot->nodes(), NodeIdToIndex);
	BuildIdMap(Snapshot->conversations(), ConversationIdToIndex);
	BuildIdMap(Snapshot->actors(), ActorIdToIndex);
	BuildIdMap(Snapshot->localizations(), LocalizationIdToIndex);
	BuildIdMap(Snapshot->edges(), EdgeIdToIndex);
	BuildIdMap(Snapshot->property_templates(), PropertyTemplateIdToIndex);
}

void UGameScriptDatabase::SetManifestAndBasePath(UGameScriptManifest* InManifest, const FString& InBasePath)
{
	Manifest = InManifest;
	BasePath = InBasePath;
}

void UGameScriptDatabase::SetCurrentLocaleIndex(int32 InLocaleIndex)
{
	CurrentLocaleIndex = InLocaleIndex;
}

#if WITH_EDITOR
#include "GameScriptLoader.h"
#include "GameScriptManifest.h"
#include "GameScriptSettings.h"
#include "Misc/FileHelper.h"
#include "Misc/Paths.h"
#include "HAL/PlatformFileManager.h"

UGameScriptDatabase* UGameScriptDatabase::EditorInstance = nullptr;
FString UGameScriptDatabase::EditorBasePath;
FString UGameScriptDatabase::EditorLoadedHash;
int32 UGameScriptDatabase::EditorLoadedLocaleId = -1;
UGameScriptManifest* UGameScriptDatabase::EditorManifest = nullptr;

void UGameScriptDatabase::EnsureEditorInstance()
{
	// Get settings
	const UGameScriptSettings* Settings = GetDefault<UGameScriptSettings>();
	if (!Settings || Settings->DataPath.Path.IsEmpty())
	{
		// Clean up if settings are invalid
		if (EditorManifest)
		{
			EditorManifest->RemoveFromRoot();
			EditorManifest = nullptr;
		}
		if (EditorInstance)
		{
			EditorInstance->RemoveFromRoot();
			EditorInstance = nullptr;
		}
		EditorBasePath.Empty();
		return;
	}

	// DataPath is relative to Content directory, convert to absolute
	FString BasePath = FPaths::Combine(FPaths::ProjectContentDir(), Settings->DataPath.Path);

	// Build manifest path
	FString ManifestPath = FPaths::Combine(BasePath, TEXT("manifest.json"));

	// Check if manifest exists
	if (!FPaths::FileExists(ManifestPath))
	{
		// Clean up if manifest doesn't exist
		if (EditorManifest)
		{
			EditorManifest->RemoveFromRoot();
			EditorManifest = nullptr;
		}
		if (EditorInstance)
		{
			EditorInstance->RemoveFromRoot();
			EditorInstance = nullptr;
		}
		EditorBasePath.Empty();
		return;
	}

	// If base path changed, invalidate cache
	if (EditorInstance && EditorBasePath != BasePath)
	{
		// Clean up old manifest
		if (EditorManifest)
		{
			EditorManifest->RemoveFromRoot();
			EditorManifest = nullptr;
		}
		// Clean up old instance
		EditorInstance->RemoveFromRoot();
		EditorInstance = nullptr;
		EditorBasePath.Empty();
		EditorLoadedHash.Empty();
		EditorLoadedLocaleId = -1;
	}

	// Create instance if needed
	if (!EditorInstance)
	{
		EditorInstance = NewObject<UGameScriptDatabase>();
		// Permanent GC root for editor session - intentionally never removed
		// This singleton persists for the entire editor lifetime to support property drawers and hot-reload
		EditorInstance->AddToRoot();
		EditorBasePath = BasePath;
	}

	// Load manifest and snapshot if not loaded
	if (EditorInstance->CurrentSnapshotPath.IsEmpty())
	{
		// Clear old manifest if present
		if (EditorManifest)
		{
			EditorManifest->RemoveFromRoot();
			EditorManifest = nullptr;
		}

		// Load manifest via the loader
		EditorManifest = UGameScriptLoader::LoadManifest(BasePath);
		if (!EditorManifest)
		{
			return;
		}

		// Keep manifest as GC root
		EditorManifest->AddToRoot();

		// Load primary locale snapshot
		FLocaleRef PrimaryLocale = EditorManifest->GetPrimaryLocale();
		if (PrimaryLocale.IsValid())
		{
			UGameScriptDatabase* Database = EditorManifest->LoadDatabase(PrimaryLocale);
			if (Database)
			{
				// Move the loaded database state to EditorInstance (transfer ownership)
				// Using MoveTemp for efficient transfer without deep copying
				EditorInstance->Snapshot = Database->Snapshot;
				EditorInstance->SnapshotBuffer = MoveTemp(Database->SnapshotBuffer);
				EditorInstance->CurrentSnapshotPath = MoveTemp(Database->CurrentSnapshotPath);
				EditorInstance->NodeIdToIndex = MoveTemp(Database->NodeIdToIndex);
				EditorInstance->ConversationIdToIndex = MoveTemp(Database->ConversationIdToIndex);
				EditorInstance->ActorIdToIndex = MoveTemp(Database->ActorIdToIndex);
				EditorInstance->LocalizationIdToIndex = MoveTemp(Database->LocalizationIdToIndex);
				EditorInstance->EdgeIdToIndex = MoveTemp(Database->EdgeIdToIndex);

				// Store manifest reference in EditorInstance for locale operations
				EditorInstance->SetManifestAndBasePath(EditorManifest, EditorBasePath);

				EditorLoadedLocaleId = PrimaryLocale.GetId();

				// Get hash from manifest for hot-reload tracking
				// Use file modification time as a simple staleness check
				IFileManager& FileManager = IFileManager::Get();
				FDateTime ModTime = FileManager.GetTimeStamp(*ManifestPath);
				EditorLoadedHash = ModTime.ToString();

				// Database object can now be safely garbage collected
				// Its data has been moved to EditorInstance
			}
		}
	}
}

void UGameScriptDatabase::CheckForHotReload()
{
	EnsureEditorInstance();

	if (!EditorInstance)
	{
		return;
	}

	// Get settings
	const UGameScriptSettings* Settings = GetDefault<UGameScriptSettings>();
	if (!Settings || Settings->DataPath.Path.IsEmpty())
	{
		return;
	}

	// DataPath is relative to Content directory, convert to absolute
	FString BasePath = FPaths::Combine(FPaths::ProjectContentDir(), Settings->DataPath.Path);
	FString ManifestPath = FPaths::Combine(BasePath, TEXT("manifest.json"));

	if (!FPaths::FileExists(ManifestPath))
	{
		return;
	}

	// Use file modification time as staleness check
	IFileManager& FileManager = IFileManager::Get();
	FDateTime ManifestModTime = FileManager.GetTimeStamp(*ManifestPath);
	FString NewHash = ManifestModTime.ToString();

	// If hash changed, reload
	if (NewHash != EditorLoadedHash)
	{
		// Remove old manifest from GC root before reload
		if (EditorManifest)
		{
			EditorManifest->RemoveFromRoot();
			EditorManifest = nullptr;
		}

		// Reload by clearing current state and triggering re-initialization
		EditorInstance->CurrentSnapshotPath.Empty();
		EditorLoadedHash.Empty();
		EnsureEditorInstance();
	}
}

FString UGameScriptDatabase::EditorGetConversationName(int32 ConversationId)
{
	EnsureEditorInstance();

	if (!EditorInstance)
	{
		return FString::Printf(TEXT("Conversation %d"), ConversationId);
	}

	FConversationRef Ref = EditorInstance->FindConversation(ConversationId);
	if (Ref.IsValid())
	{
		return Ref.GetName();
	}

	return FString::Printf(TEXT("Conversation %d (not found)"), ConversationId);
}

FString UGameScriptDatabase::EditorGetActorName(int32 ActorId)
{
	EnsureEditorInstance();

	if (!EditorInstance)
	{
		return FString::Printf(TEXT("Actor %d"), ActorId);
	}

	FActorRef Ref = EditorInstance->FindActor(ActorId);
	if (Ref.IsValid())
	{
		return Ref.GetName();
	}

	return FString::Printf(TEXT("Actor %d (not found)"), ActorId);
}

FString UGameScriptDatabase::EditorGetLocalizationKey(int32 LocalizationId)
{
	EnsureEditorInstance();

	if (!EditorInstance)
	{
		return FString::Printf(TEXT("Localization %d"), LocalizationId);
	}

	FLocalizationRef Ref = EditorInstance->FindLocalization(LocalizationId);
	if (Ref.IsValid())
	{
		return Ref.GetKey();
	}

	return FString::Printf(TEXT("Localization %d (not found)"), LocalizationId);
}

FString UGameScriptDatabase::EditorGetLocaleName(int32 LocaleId)
{
	EnsureEditorInstance();

	if (!EditorManifest)
	{
		return FString::Printf(TEXT("Locale %d"), LocaleId);
	}

	// Find locale by ID in manifest
	for (int32 i = 0; i < EditorManifest->GetLocaleCount(); ++i)
	{
		FLocaleRef Locale = EditorManifest->GetLocale(i);
		if (Locale.GetId() == LocaleId)
		{
			return Locale.GetName();
		}
	}

	return FString::Printf(TEXT("Locale %d (not found)"), LocaleId);
}

// Template helper implementation (must be in .cpp since it uses EditorInstance)
// Uses generic TStringGetter to avoid exposing flatbuffers::String in public header
template<typename TCollection, typename TEntity, typename TStringGetter>
bool UGameScriptDatabase::EditorGetAllEntities(
	const TCollection* (GameScript::Snapshot::*CollectionGetter)() const,
	TStringGetter StringFieldGetter,
	TArray<int32>& OutIds,
	TArray<FString>& OutStrings)
{
	EnsureEditorInstance();

	if (!EditorInstance || !EditorInstance->Snapshot)
	{
		return false;
	}

	// Get collection from snapshot
	const TCollection* Collection = (EditorInstance->Snapshot->*CollectionGetter)();
	if (!Collection)
	{
		return false;
	}

	// Reserve space for all entities
	OutIds.Reserve(Collection->size());
	OutStrings.Reserve(Collection->size());

	// Extract IDs and strings
	for (int32 i = 0; i < static_cast<int32>(Collection->size()); ++i)
	{
		const TEntity* Entity = Collection->Get(i);
		// TStringGetter is deduced as member function pointer type (flatbuffers::String* (TEntity::*)() const)
		const auto* StringField = Entity ? (Entity->*StringFieldGetter)() : nullptr;

		if (Entity && StringField)
		{
			OutIds.Add(Entity->id());
			OutStrings.Add(FString(StringField->c_str()));
		}
	}

	return true;
}

bool UGameScriptDatabase::EditorGetAllConversations(TArray<int32>& OutIds, TArray<FString>& OutNames)
{
	return EditorGetAllEntities<flatbuffers::Vector<flatbuffers::Offset<GameScript::Conversation>>, GameScript::Conversation>(
		&GameScript::Snapshot::conversations,
		&GameScript::Conversation::name,
		OutIds,
		OutNames);
}

bool UGameScriptDatabase::EditorGetAllActors(TArray<int32>& OutIds, TArray<FString>& OutNames)
{
	return EditorGetAllEntities<flatbuffers::Vector<flatbuffers::Offset<GameScript::Actor>>, GameScript::Actor>(
		&GameScript::Snapshot::actors,
		&GameScript::Actor::name,
		OutIds,
		OutNames);
}

bool UGameScriptDatabase::EditorGetAllLocalizations(TArray<int32>& OutIds, TArray<FString>& OutKeys)
{
	return EditorGetAllEntities<flatbuffers::Vector<flatbuffers::Offset<GameScript::Localization>>, GameScript::Localization>(
		&GameScript::Snapshot::localizations,
		&GameScript::Localization::name,
		OutIds,
		OutKeys);
}

bool UGameScriptDatabase::EditorGetAllLocales(TArray<int32>& OutIds, TArray<FString>& OutCodes)
{
	EnsureEditorInstance();

	OutIds.Empty();
	OutCodes.Empty();

	if (!EditorManifest)
	{
		return false;
	}

	// Get all locales from manifest
	for (int32 i = 0; i < EditorManifest->GetLocaleCount(); ++i)
	{
		FLocaleRef Locale = EditorManifest->GetLocale(i);
		if (Locale.IsValid())
		{
			OutIds.Add(Locale.GetId());
			OutCodes.Add(Locale.GetName());
		}
	}

	return OutIds.Num() > 0;
}
#endif
