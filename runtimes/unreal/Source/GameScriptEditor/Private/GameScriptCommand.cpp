#include "GameScriptCommand.h"
#include "GameScriptSettings.h"
#include "Misc/FileHelper.h"
#include "Misc/Paths.h"
#include "HAL/PlatformFileManager.h"
#include "JsonObjectConverter.h"

void FGameScriptCommandWriter::Navigate(ECommandEntityType EntityType, int32 Id)
{
	Navigate(FGameScriptCommand::EntityTypeToString(EntityType), Id);
}

void FGameScriptCommandWriter::Navigate(const FString& EntityTypeString, int32 Id)
{
	FString DataPath = GetGameScriptDataPath();
	if (DataPath.IsEmpty())
	{
		return;
	}

	IPlatformFile& PlatformFile = FPlatformFileManager::Get().GetPlatformFile();
	if (!PlatformFile.DirectoryExists(*DataPath))
	{
		return;
	}

	// Create command structure
	FGameScriptCommand Command(CommandAction::Navigate, EntityTypeString, Id);

	// Write to command file
	WriteCommandFile(Command);
}

FString FGameScriptCommandWriter::GetGameScriptDataPath()
{
	const UGameScriptSettings* Settings = GetDefault<UGameScriptSettings>();
	if (!Settings)
	{
		return FString();
	}

	FString PathStr = Settings->DataPath.Path;
	if (PathStr.IsEmpty())
	{
		return FString();
	}

	// DataPath is relative to Content directory
	return FPaths::Combine(FPaths::ProjectContentDir(), PathStr);
}

void FGameScriptCommandWriter::WriteCommandFile(const FGameScriptCommand& Command)
{
	FString DataPath = GetGameScriptDataPath();
	if (DataPath.IsEmpty())
	{
		return;
	}

	FString CommandPath = FPaths::Combine(DataPath, FGameScriptCommand::Filename);

	// Convert to JSON
	FString JsonString;
	if (!FJsonObjectConverter::UStructToJsonObjectString(Command, JsonString, 0, 0))
	{
		return;
	}

	// Write to file
	FFileHelper::SaveStringToFile(JsonString, *CommandPath);
}
