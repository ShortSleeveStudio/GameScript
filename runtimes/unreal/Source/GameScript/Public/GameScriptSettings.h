#pragma once

#include "CoreMinimal.h"
#include "Engine/DeveloperSettings.h"
#include "GameScriptSettings.generated.h"

/**
 * Wrapper for executable/application paths with custom property drawer.
 * On macOS, supports selecting .app bundles via a native file dialog.
 */
USTRUCT()
struct GAMESCRIPT_API FGSExecutablePath
{
	GENERATED_BODY()

	UPROPERTY(EditAnywhere, Category = "Path")
	FString Path;

	FGSExecutablePath() = default;
	explicit FGSExecutablePath(const FString& InPath) : Path(InPath) {}

	bool IsEmpty() const { return Path.IsEmpty(); }
};

/**
 * Project settings for GameScript.
 * Accessible via Project Settings -> Plugins -> GameScript
 */
UCLASS(Config=Game, DefaultConfig, meta=(DisplayName="GameScript"))
class GAMESCRIPT_API UGameScriptSettings : public UDeveloperSettings
{
	GENERATED_BODY()

public:
	UGameScriptSettings();

	// UDeveloperSettings interface
	virtual FName GetCategoryName() const override { return TEXT("Plugins"); }
	// End UDeveloperSettings interface

	/**
	 * Path to GameScript data directory.
	 * Used for both runtime snapshot loading (.gsb files) and editor IPC (command.tmp).
	 * Default: GameScript
	 * Relative to project Content directory.
	 */
	UPROPERTY(Config, EditAnywhere, Category = "Paths", meta = (RelativeToGameContentDir))
	FDirectoryPath DataPath;

	/**
	 * Maximum number of concurrent conversations.
	 * Determines runner context pool size.
	 */
	UPROPERTY(Config, EditAnywhere, Category = "Runtime", meta=(ClampMin="1", ClampMax="100"))
	int32 MaxConcurrentConversations;

	/**
	 * When enabled, automatically advances if there's only one valid choice instead of showing a single-option choice UI.
	 * Disable this if you want to show confirmation prompts for single choices with UI response text.
	 */
	UPROPERTY(Config, EditAnywhere, Category = "Runtime")
	bool bPreventSingleNodeChoices;

	/**
	 * Enable verbose logging for debugging.
	 */
	UPROPERTY(Config, EditAnywhere, Category = "Debug")
	bool bVerboseLogging;

	/**
	 * Path to IDE executable for launching when Edit button is clicked in property drawers.
	 * Leave empty to use Unreal's configured IDE (may open new windows on Mac).
	 *
	 * Examples:
	 * - macOS VS Code: /Applications/Visual Studio Code.app
	 * - macOS Rider: /Applications/Rider.app
	 * - Windows VS Code: C:\Program Files\Microsoft VS Code\Code.exe
	 */
	UPROPERTY(Config, EditAnywhere, Category = "Editor Integration")
	FGSExecutablePath IDEExecutablePath;
};
