#pragma once

#include "CoreMinimal.h"
#include "Kismet/BlueprintFunctionLibrary.h"
#include "GameScriptLoader.generated.h"

// Forward declarations
class UGameScriptManifest;
struct FManifestLocale;

/**
 * Static entry point for loading GameScript manifests.
 *
 * Usage:
 *   UGameScriptManifest* Manifest = UGameScriptLoader::LoadManifest();
 *   FLocaleRef Locale = Manifest->GetPrimaryLocale();
 *   UGameScriptDatabase* Database = Manifest->LoadDatabase(Locale);
 *   UGameScriptRunner* Runner = NewObject<UGameScriptRunner>(GetTransientPackage());
 *   Runner->Initialize(Database, Settings);
 *
 * Or use convenience methods:
 *   UGameScriptRunner* Runner = Manifest->CreateRunnerWithPrimaryLocale(Settings);
 */
UCLASS()
class GAMESCRIPT_API UGameScriptLoader : public UBlueprintFunctionLibrary
{
	GENERATED_BODY()

public:
	/**
	 * Load the GameScript manifest from the project's GameScript directory.
	 * @param BasePath - Base path to GameScript directory (default: Content/GameScript)
	 * @return Manifest handle with locale metadata
	 */
	UFUNCTION(BlueprintCallable, Category = "GameScript")
	static UGameScriptManifest* LoadManifest(const FString& BasePath = TEXT(""));

private:
	/**
	 * Parse manifest.json and extract locale metadata.
	 */
	static bool ParseManifest(
		const FString& ManifestPath,
		TArray<FManifestLocale>& OutLocales,
		int32& OutPrimaryLocaleIndex
	);

	/**
	 * Get default GameScript base path.
	 */
	static FString GetDefaultBasePath();
};
