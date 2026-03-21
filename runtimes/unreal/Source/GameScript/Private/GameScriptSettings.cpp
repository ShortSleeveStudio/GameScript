#include "GameScriptSettings.h"

UGameScriptSettings::UGameScriptSettings()
{
	// Default values
	DataPath.Path = TEXT("GameScript");
	MaxConcurrentConversations = 10;
	bVerboseLogging = false;
	bPreventSingleNodeChoices = true; // Match Unity/Godot default
	EditorLocaleIndex = -1; // -1 = use primary from manifest
}
