#pragma once

#include "CoreMinimal.h"
#include "UObject/Object.h"
#include "Refs.h"
#include "GameScriptManifest.generated.h"

// Forward declarations
class UGameScriptDatabase;
class UGameScriptRunner;
class UGameScriptSettings;

/**
 * Locale metadata stored in manifest.json.
 * Matches Unity's ManifestLocale structure.
 */
USTRUCT(BlueprintType)
struct GAMESCRIPT_API FManifestLocale
{
	GENERATED_BODY()

	UPROPERTY(BlueprintReadOnly, Category = "GameScript")
	int32 Id = -1;

	UPROPERTY(BlueprintReadOnly, Category = "GameScript")
	FString Name;  // Internal code, e.g., "en_US"

	UPROPERTY(BlueprintReadOnly, Category = "GameScript")
	FString LocalizedName;  // Display name, e.g., "English (US)"

	UPROPERTY(BlueprintReadOnly, Category = "GameScript")
	FString Hash;  // Snapshot hash for hot-reload detection
};

/**
 * Manifest handle for a GameScript snapshot bundle.
 * Contains locale metadata and provides factory methods for databases/runners.
 *
 * Workflow:
 * 1. LoadManifest() -> UGameScriptManifest (lightweight, contains locale list)
 * 2. Query available locales
 * 3. LoadDatabase(locale) -> UGameScriptDatabase (loads .gsb snapshot)
 * 4. CreateRunner() -> UGameScriptRunner (creates execution engine)
 *
 * Usage Examples:
 *
 * \code
 * // Example 1: Simple startup with primary locale
 * void AMyGameMode::BeginPlay()
 * {
 *     // Load manifest from default location (Content/GameScript)
 *     UGameScriptManifest* Manifest = UGameScriptLoader::LoadManifest();
 *     if (!Manifest)
 *     {
 *         UE_LOG(LogTemp, Error, TEXT("Failed to load GameScript manifest"));
 *         return;
 *     }
 *
 *     // Create runner with primary locale and default settings
 *     const UGameScriptSettings* Settings = GetDefault<UGameScriptSettings>();
 *     Runner = Manifest->CreateRunnerWithPrimaryLocale(Settings);
 *
 *     // Start a conversation
 *     FActiveConversation Handle = Runner->StartConversation(
 *         123,              // Conversation ID
 *         MyDialogueUI,     // Listener (implements IGameScriptListener)
 *         GetWorld()->GetFirstPlayerController()->GetPawn()  // Task owner
 *     );
 * }
 *
 * // Example 2: Locale selection (e.g., from settings menu)
 * void AMyGameMode::LoadWithSavedLocale(int32 SavedLocaleId)
 * {
 *     UGameScriptManifest* Manifest = UGameScriptLoader::LoadManifest();
 *
 *     // Try to find saved locale, fallback to primary
 *     FLocaleRef Locale;
 *     if (!Manifest->TryFindLocale(SavedLocaleId, Locale))
 *     {
 *         Locale = Manifest->GetPrimaryLocale();
 *     }
 *
 *     // Create runner with selected locale
 *     Runner = Manifest->CreateRunner(Locale, GetDefault<UGameScriptSettings>());
 * }
 *
 * // Example 3: Locale picker UI
 * void UMyLocalePickerWidget::PopulateLocaleList()
 * {
 *     UGameScriptManifest* Manifest = UGameScriptLoader::LoadManifest();
 *
 *     for (int32 i = 0; i < Manifest->GetLocaleCount(); ++i)
 *     {
 *         FLocaleRef Locale = Manifest->GetLocale(i);
 *         FString DisplayName = Locale.GetName();  // e.g., "English (US)"
 *         FString Code = Locale.GetCode();         // e.g., "en_US"
 *
 *         AddLocaleButton(DisplayName, Locale.GetId());
 *     }
 * }
 * \endcode
 */
UCLASS(BlueprintType)
class GAMESCRIPT_API UGameScriptManifest : public UObject
{
	GENERATED_BODY()

public:
	/**
	 * Load a database for a specific locale.
	 * @param Locale - The locale to load
	 * @return Database loaded with the locale's snapshot
	 */
	UFUNCTION(BlueprintCallable, Category = "GameScript")
	UGameScriptDatabase* LoadDatabase(FLocaleRef Locale);

	/**
	 * Create a runner with a specific locale.
	 * Convenience method: loads database + creates runner.
	 */
	UFUNCTION(BlueprintCallable, Category = "GameScript")
	UGameScriptRunner* CreateRunner(FLocaleRef Locale, UGameScriptSettings* Settings);

	/**
	 * Create a runner with the primary locale.
	 * Convenience method: uses primary locale + loads database + creates runner.
	 */
	UFUNCTION(BlueprintCallable, Category = "GameScript")
	UGameScriptRunner* CreateRunnerWithPrimaryLocale(UGameScriptSettings* Settings);

	/**
	 * Get the primary locale for this manifest.
	 */
	UFUNCTION(BlueprintPure, Category = "GameScript")
	FLocaleRef GetPrimaryLocale() const;

	/**
	 * Get the number of available locales.
	 */
	UFUNCTION(BlueprintPure, Category = "GameScript")
	int32 GetLocaleCount() const { return Locales.Num(); }

	/**
	 * Get a locale by index.
	 */
	UFUNCTION(BlueprintPure, Category = "GameScript")
	FLocaleRef GetLocale(int32 Index) const;

	/**
	 * Try to find a locale by its database ID.
	 * @param LocaleId - The database ID of the locale
	 * @param OutLocale - The found locale (if any)
	 * @return True if found, false otherwise
	 */
	UFUNCTION(BlueprintPure, Category = "GameScript")
	bool TryFindLocale(int32 LocaleId, FLocaleRef& OutLocale) const;

	// Internal: Called by UGameScriptLoader
	void Initialize(const FString& InBasePath, const TArray<FManifestLocale>& InLocales, int32 InPrimaryLocaleIndex);

	// Internal: Get locale metadata by index (for FLocaleRef)
	const FManifestLocale& GetLocaleMetadata(int32 Index) const;

private:
	UPROPERTY()
	FString BasePath;

	// Locale metadata array (matches Unity's Manifest.Locales)
	UPROPERTY()
	TArray<FManifestLocale> Locales;

	// Primary locale index (not ID - index into Locales array)
	int32 PrimaryLocaleIndex = -1;
};
