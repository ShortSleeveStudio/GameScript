#include "GameScriptLoader.h"
#include "GameScriptManifest.h"
#include "GameScriptSettings.h"
#include "GameScript.h"
#include "Misc/FileHelper.h"
#include "Misc/Paths.h"
#include "Serialization/JsonSerializer.h"
#include "Serialization/JsonReader.h"

UGameScriptManifest* UGameScriptLoader::LoadManifest(const FString& BasePath)
{
	FString ActualBasePath = BasePath.IsEmpty() ? GetDefaultBasePath() : BasePath;
	FString ManifestPath = FPaths::Combine(ActualBasePath, TEXT("manifest.json"));

	// Parse manifest
	TArray<FManifestLocale> Locales;
	int32 PrimaryLocaleIndex = -1;

	if (!ParseManifest(ManifestPath, Locales, PrimaryLocaleIndex))
	{
		UE_LOG(LogGameScript, Error, TEXT("Failed to parse manifest at %s"), *ManifestPath);
		return nullptr;
	}

	// Create manifest object
	UGameScriptManifest* Manifest = NewObject<UGameScriptManifest>();
	Manifest->Initialize(ActualBasePath, Locales, PrimaryLocaleIndex);

	return Manifest;
}

bool UGameScriptLoader::ParseManifest(
	const FString& ManifestPath,
	TArray<FManifestLocale>& OutLocales,
	int32& OutPrimaryLocaleIndex)
{
	// Read manifest file
	FString JsonString;
	if (!FFileHelper::LoadFileToString(JsonString, *ManifestPath))
	{
		UE_LOG(LogGameScript, Error, TEXT("Failed to read manifest file: %s"), *ManifestPath);
		return false;
	}

	// Parse JSON
	TSharedPtr<FJsonObject> JsonObject;
	TSharedRef<TJsonReader<>> Reader = TJsonReaderFactory<>::Create(JsonString);

	if (!FJsonSerializer::Deserialize(Reader, JsonObject) || !JsonObject.IsValid())
	{
		UE_LOG(LogGameScript, Error, TEXT("Failed to parse manifest JSON: %s"), *ManifestPath);
		return false;
	}

	// Read primary locale index
	if (!JsonObject->HasField(TEXT("primaryLocale")))
	{
		UE_LOG(LogGameScript, Error, TEXT("Manifest missing 'primaryLocale' field: %s"), *ManifestPath);
		return false;
	}
	OutPrimaryLocaleIndex = JsonObject->GetIntegerField(TEXT("primaryLocale"));

	// Read locales array
	const TArray<TSharedPtr<FJsonValue>>* LocalesArray;
	if (!JsonObject->TryGetArrayField(TEXT("locales"), LocalesArray))
	{
		UE_LOG(LogGameScript, Error, TEXT("Manifest missing 'locales' array: %s"), *ManifestPath);
		return false;
	}

	for (const TSharedPtr<FJsonValue>& LocaleValue : *LocalesArray)
	{
		if (!LocaleValue.IsValid())
		{
			UE_LOG(LogGameScript, Warning, TEXT("Invalid locale entry in manifest: %s"), *ManifestPath);
			continue;
		}

		TSharedPtr<FJsonObject> LocaleObj = LocaleValue->AsObject();
		if (!LocaleObj.IsValid())
		{
			UE_LOG(LogGameScript, Warning, TEXT("Locale entry is not an object in manifest: %s"), *ManifestPath);
			continue;
		}

		FManifestLocale Locale;
		Locale.Id = LocaleObj->GetIntegerField(TEXT("id"));
		Locale.Name = LocaleObj->GetStringField(TEXT("name"));
		Locale.LocalizedName = LocaleObj->GetStringField(TEXT("localizedName"));
		Locale.Hash = LocaleObj->GetStringField(TEXT("hash"));

		OutLocales.Add(Locale);
	}

	return true;
}

FString UGameScriptLoader::GetDefaultBasePath()
{
	// Try to get from settings
	const UGameScriptSettings* Settings = GetDefault<UGameScriptSettings>();
	if (Settings && !Settings->DataPath.Path.IsEmpty())
	{
		return FPaths::Combine(FPaths::ProjectContentDir(), Settings->DataPath.Path);
	}

	// Fallback to default
	return FPaths::Combine(FPaths::ProjectContentDir(), TEXT("GameScript"));
}
