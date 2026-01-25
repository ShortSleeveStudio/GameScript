#include "GameScript.h"

DEFINE_LOG_CATEGORY(LogGameScript);

#define LOCTEXT_NAMESPACE "FGameScriptModule"

void FGameScriptModule::StartupModule()
{
	// Module initialization
}

void FGameScriptModule::ShutdownModule()
{
	// Module cleanup
}

#undef LOCTEXT_NAMESPACE

IMPLEMENT_MODULE(FGameScriptModule, GameScript)
