#pragma once

#include "CoreMinimal.h"
#include "Modules/ModuleManager.h"

class FGameScriptEditorModule : public IModuleInterface
{
public:
	virtual void StartupModule() override;
	virtual void ShutdownModule() override;

private:
	/** Register menu extensions. Called after ToolMenus is ready. */
	void RegisterMenus();
};
