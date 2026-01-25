#pragma once

#include "CoreMinimal.h"
#include "UObject/Object.h"
#include "Refs.h"
#include "GameScriptDatabase.generated.h"

// Forward declaration of FlatBuffers snapshot type
namespace GameScript
{
	struct Snapshot;
}

/**
 * Database providing access to FlatBuffers snapshot data.
 * Zero-copy access - all ref types read directly from the buffer.
 *
 * Workflow:
 * 1. Created by UGameScriptManifest::LoadDatabase(locale)
 * 2. Loads .gsb snapshot for the specified locale
 * 3. Provides entity lookups by ID or index
 * 4. Can change locale at runtime (reloads snapshot)
 *
 * Editor Support:
 * - EditorInstance provides lazy-loaded singleton with hot-reload
 * - Property drawers use EditorInstance for name lookups
 */
UCLASS(BlueprintType)
class GAMESCRIPT_API UGameScriptDatabase : public UObject
{
	GENERATED_BODY()

public:
	UGameScriptDatabase();
	virtual ~UGameScriptDatabase();

	/**
	 * Load a snapshot from disk.
	 * @param SnapshotPath - Full path to .gsb file
	 * @return True if loaded successfully
	 */
	bool LoadSnapshot(const FString& SnapshotPath);

	/**
	 * Get the currently loaded locale.
	 * Returns invalid ref if no locale is loaded or if database wasn't created via manifest.
	 */
	UFUNCTION(BlueprintPure, Category = "GameScript")
	FLocaleRef GetCurrentLocale() const;

	/**
	 * Change the current locale (reloads snapshot).
	 * Broadcasts OnLocaleChanged after successful reload.
	 * @return True if locale changed successfully, false otherwise
	 */
	UFUNCTION(BlueprintCallable, Category = "GameScript")
	bool ChangeLocale(FLocaleRef NewLocale);

	/**
	 * Delegate broadcast after locale change completes successfully.
	 * Use this to refresh UI or restart conversations when locale changes.
	 */
	DECLARE_DYNAMIC_MULTICAST_DELEGATE(FOnLocaleChanged);

	UPROPERTY(BlueprintAssignable, Category = "GameScript")
	FOnLocaleChanged OnLocaleChanged;

	// --- Entity Count ---

	int32 GetNodeCount() const;
	int32 GetConversationCount() const;
	int32 GetActorCount() const;
	int32 GetLocalizationCount() const;
	int32 GetEdgeCount() const;
	int32 GetPropertyTemplateCount() const;

	// --- Entity Lookups by ID ---
	// Find methods return invalid ref if not found (silent failure, Blueprint-friendly)

	UFUNCTION(BlueprintPure, Category = "GameScript")
	FNodeRef FindNode(int32 NodeId) const;

	UFUNCTION(BlueprintPure, Category = "GameScript")
	FConversationRef FindConversation(int32 ConversationId) const;

	UFUNCTION(BlueprintPure, Category = "GameScript")
	FActorRef FindActor(int32 ActorId) const;

	UFUNCTION(BlueprintPure, Category = "GameScript")
	FLocalizationRef FindLocalization(int32 LocalizationId) const;

	UFUNCTION(BlueprintPure, Category = "GameScript")
	FEdgeRef FindEdge(int32 EdgeId) const;

	UFUNCTION(BlueprintPure, Category = "GameScript")
	FPropertyTemplateRef FindPropertyTemplate(int32 TemplateId) const;

	// --- Checked Lookups (C++ only, fail-fast for development) ---
	// These log errors and return invalid ref if not found. Use in development builds
	// where missing data indicates a bug that should be fixed.

	FNodeRef FindNodeChecked(int32 NodeId) const;
	FConversationRef FindConversationChecked(int32 ConversationId) const;
	FActorRef FindActorChecked(int32 ActorId) const;
	FLocalizationRef FindLocalizationChecked(int32 LocalizationId) const;
	FEdgeRef FindEdgeChecked(int32 EdgeId) const;
	FPropertyTemplateRef FindPropertyTemplateChecked(int32 TemplateId) const;

	// --- Entity Access by Index (faster) ---

	UFUNCTION(BlueprintPure, Category = "GameScript")
	FNodeRef GetNodeByIndex(int32 Index) const;

	UFUNCTION(BlueprintPure, Category = "GameScript")
	FConversationRef GetConversationByIndex(int32 Index) const;

	UFUNCTION(BlueprintPure, Category = "GameScript")
	FActorRef GetActorByIndex(int32 Index) const;

	UFUNCTION(BlueprintPure, Category = "GameScript")
	FLocalizationRef GetLocalizationByIndex(int32 Index) const;

	UFUNCTION(BlueprintPure, Category = "GameScript")
	FEdgeRef GetEdgeByIndex(int32 Index) const;

	UFUNCTION(BlueprintPure, Category = "GameScript")
	FPropertyTemplateRef GetPropertyTemplateByIndex(int32 Index) const;

	// --- Internal Access ---

	const GameScript::Snapshot* GetSnapshot() const { return Snapshot; }

#if WITH_EDITOR
	/**
	 * Editor singleton for property drawers.
	 * Lazy-loaded with hot-reload detection.
	 */
	static UGameScriptDatabase* EditorInstance;

	/**
	 * Check if snapshot has changed and reload if needed.
	 * Called by property drawers before data access.
	 */
	static void CheckForHotReload();

	/**
	 * Helper methods for property drawers.
	 */
	static FString EditorGetConversationName(int32 ConversationId);
	static FString EditorGetActorName(int32 ActorId);
	static FString EditorGetLocalizationKey(int32 LocalizationId);
	static FString EditorGetLocaleName(int32 LocaleId);

	/**
	 * Helper methods for picker windows.
	 * Return all entities from the snapshot.
	 */
	static bool EditorGetAllConversations(TArray<int32>& OutIds, TArray<FString>& OutNames);
	static bool EditorGetAllActors(TArray<int32>& OutIds, TArray<FString>& OutNames);
	static bool EditorGetAllLocalizations(TArray<int32>& OutIds, TArray<FString>& OutKeys);
	static bool EditorGetAllLocales(TArray<int32>& OutIds, TArray<FString>& OutCodes);

private:
	// Editor-only state for hot-reload detection
	static FString EditorBasePath;
	static FString EditorLoadedHash;
	static int32 EditorLoadedLocaleId;
	static UGameScriptManifest* EditorManifest;

	/** Ensure EditorInstance is initialized and up to date. */
	static void EnsureEditorInstance();
#endif

private:
	// FlatBuffers snapshot (parsed from .gsb file)
	const GameScript::Snapshot* Snapshot = nullptr;

	// Buffer backing the snapshot (must outlive Snapshot pointer)
	TArray<uint8> SnapshotBuffer;

	// Current snapshot path (for reloading)
	FString CurrentSnapshotPath;

	// Manifest reference (for locale switching - weak to avoid circular GC reference)
	TWeakObjectPtr<class UGameScriptManifest> Manifest;

	// Base path for reconstructing snapshot paths
	FString BasePath;

	// Currently loaded locale index (for GetCurrentLocale)
	int32 CurrentLocaleIndex = -1;

	// ID to index maps (for O(log N) lookup by ID)
	TMap<int32, int32> NodeIdToIndex;
	TMap<int32, int32> ConversationIdToIndex;
	TMap<int32, int32> ActorIdToIndex;
	TMap<int32, int32> LocalizationIdToIndex;
	TMap<int32, int32> EdgeIdToIndex;
	TMap<int32, int32> PropertyTemplateIdToIndex;

	/**
	 * Build ID-to-index maps after loading snapshot.
	 */
	void BuildIdMaps();

	/**
	 * Template helper: Get collection count from snapshot.
	 * Eliminates duplication in GetXXXCount() methods.
	 */
	template<typename TCollection>
	int32 GetCollectionCount(TCollection* (GameScript::Snapshot::*Getter)() const) const
	{
		if (!Snapshot)
		{
			return 0;
		}
		const TCollection* Collection = (Snapshot->*Getter)();
		return Collection ? Collection->size() : 0;
	}

	/**
	 * Template helper: Find entity by ID using ID-to-index map.
	 * Eliminates duplication in FindXXX() methods.
	 */
	template<typename TRefType>
	TRefType FindEntityById(const TMap<int32, int32>& IdToIndexMap, int32 EntityId) const
	{
		const int32* Index = IdToIndexMap.Find(EntityId);
		return Index ? TRefType(this, *Index) : TRefType();
	}

	/**
	 * Template helper: Get entity by array index with bounds checking.
	 * Eliminates duplication in GetXXXByIndex() methods.
	 */
	template<typename TRefType, typename TCountFunc>
	TRefType GetEntityByIndex(int32 Index, TCountFunc GetCount) const
	{
		if (Index >= 0 && Index < GetCount())
		{
			return TRefType(this, Index);
		}
		return TRefType();
	}

	/**
	 * Template helper: Get all entities from snapshot with ID and name extraction.
	 * Eliminates duplication in EditorGetAllXXX() methods.
	 * Implementation in .cpp file to avoid exposing FlatBuffers types in public header.
	 */
	template<typename TCollection, typename TEntity, typename TStringGetter>
	static bool EditorGetAllEntities(
		const TCollection* (GameScript::Snapshot::*CollectionGetter)() const,
		TStringGetter StringFieldGetter,
		TArray<int32>& OutIds,
		TArray<FString>& OutStrings);

	// Internal: Set manifest and base path (called by UGameScriptManifest::LoadDatabase)
	// Implementation in .cpp to avoid TWeakObjectPtr<> template instantiation with incomplete type
	friend class UGameScriptManifest;
	void SetManifestAndBasePath(UGameScriptManifest* InManifest, const FString& InBasePath);
	void SetCurrentLocaleIndex(int32 InLocaleIndex);
};
