#include "GameScriptEditor.h"
#include "PropertyEditorModule.h"
#include "Ids.h"
#include "GameScriptSettings.h"
#include "GameScriptBuildValidation.h"
#include "GameScriptDatabase.h"
#include "ToolMenus.h"
#include "LevelEditor.h"

// Property customizations
#include "PropertyDrawers/ConversationIdCustomization.h"
#include "PropertyDrawers/ActorIdCustomization.h"
#include "PropertyDrawers/LocalizationIdCustomization.h"
#include "PropertyDrawers/LocaleIdCustomization.h"
#include "PropertyDrawers/ExecutablePathCustomization.h"

// Test rig
#include "TestRig/SGameScriptTestRig.h"

#define LOCTEXT_NAMESPACE "FGameScriptEditorModule"

// Cache struct names at startup - StaticStruct() may be invalid during shutdown
static FName CachedConversationIdName;
static FName CachedActorIdName;
static FName CachedLocalizationIdName;
static FName CachedLocaleIdName;
static FName CachedExecutablePathName;

void FGameScriptEditorModule::StartupModule()
{
	// Register PIE validation
	FGameScriptBuildValidation::RegisterPIEValidation();

	// Cache struct names for use during shutdown (StaticStruct() may be invalid then)
	CachedConversationIdName = FGSConversationId::StaticStruct()->GetFName();
	CachedActorIdName = FGSActorId::StaticStruct()->GetFName();
	CachedLocalizationIdName = FGSLocalizationId::StaticStruct()->GetFName();
	CachedLocaleIdName = FGSLocaleId::StaticStruct()->GetFName();
	CachedExecutablePathName = FGSExecutablePath::StaticStruct()->GetFName();

	// Register property type customizations
	FPropertyEditorModule& PropertyModule = FModuleManager::LoadModuleChecked<FPropertyEditorModule>("PropertyEditor");

	PropertyModule.RegisterCustomPropertyTypeLayout(
		CachedConversationIdName,
		FOnGetPropertyTypeCustomizationInstance::CreateStatic(&FConversationIdCustomization::MakeInstance)
	);

	PropertyModule.RegisterCustomPropertyTypeLayout(
		CachedActorIdName,
		FOnGetPropertyTypeCustomizationInstance::CreateStatic(&FActorIdCustomization::MakeInstance)
	);

	PropertyModule.RegisterCustomPropertyTypeLayout(
		CachedLocalizationIdName,
		FOnGetPropertyTypeCustomizationInstance::CreateStatic(&FLocalizationIdCustomization::MakeInstance)
	);

	PropertyModule.RegisterCustomPropertyTypeLayout(
		CachedLocaleIdName,
		FOnGetPropertyTypeCustomizationInstance::CreateStatic(&FLocaleIdCustomization::MakeInstance)
	);

	PropertyModule.RegisterCustomPropertyTypeLayout(
		CachedExecutablePathName,
		FOnGetPropertyTypeCustomizationInstance::CreateStatic(&FExecutablePathCustomization::MakeInstance)
	);

	PropertyModule.NotifyCustomizationModuleChanged();

	// Register menu extension after ToolMenus is ready
	UToolMenus::RegisterStartupCallback(FSimpleMulticastDelegate::FDelegate::CreateRaw(this, &FGameScriptEditorModule::RegisterMenus));
}

void FGameScriptEditorModule::RegisterMenus()
{
	// Extend the Tools menu
	UToolMenu* Menu = UToolMenus::Get()->ExtendMenu("LevelEditor.MainMenu.Tools");
	if (Menu)
	{
		FToolMenuSection& Section = Menu->FindOrAddSection("GameScript");
		Section.Label = LOCTEXT("GameScriptMenuLabel", "GameScript");

		Section.AddMenuEntry(
			"OpenTestRig",
			LOCTEXT("OpenTestRig", "Test Rig"),
			LOCTEXT("OpenTestRigTooltip", "Open the GameScript conversation test rig"),
			FSlateIcon(),
			FUIAction(FExecuteAction::CreateStatic(&SGameScriptTestRig::OpenWindow))
		);
	}
}

void FGameScriptEditorModule::ShutdownModule()
{
	// Unregister menus
	UToolMenus::UnRegisterStartupCallback(this);
	UToolMenus::UnregisterOwner(this);

	// Close test rig window if open
	SGameScriptTestRig::CloseWindow();

	// Unregister PIE validation
	FGameScriptBuildValidation::UnregisterPIEValidation();

	// Cleanup EditorInstance to prevent memory leak
	// During engine shutdown (GIsRequestingExit), skip this cleanup entirely:
	// - The GC system may be in an inconsistent state
	// - Unreal will clean up all rooted objects during shutdown anyway
	// - Attempting to access UObjects during shutdown can crash
	if (!IsEngineExitRequested() && IsValid(UGameScriptDatabase::EditorInstance))
	{
		UGameScriptDatabase::EditorInstance->RemoveFromRoot();
		UGameScriptDatabase::EditorInstance = nullptr;
	}

	// Unregister property type customizations using cached names
	// (StaticStruct() may be invalid during shutdown)
	if (FModuleManager::Get().IsModuleLoaded("PropertyEditor"))
	{
		FPropertyEditorModule& PropertyModule = FModuleManager::GetModuleChecked<FPropertyEditorModule>("PropertyEditor");

		PropertyModule.UnregisterCustomPropertyTypeLayout(CachedConversationIdName);
		PropertyModule.UnregisterCustomPropertyTypeLayout(CachedActorIdName);
		PropertyModule.UnregisterCustomPropertyTypeLayout(CachedLocalizationIdName);
		PropertyModule.UnregisterCustomPropertyTypeLayout(CachedLocaleIdName);
		PropertyModule.UnregisterCustomPropertyTypeLayout(CachedExecutablePathName);

		PropertyModule.NotifyCustomizationModuleChanged();
	}
}

#undef LOCTEXT_NAMESPACE

IMPLEMENT_MODULE(FGameScriptEditorModule, GameScriptEditor)
