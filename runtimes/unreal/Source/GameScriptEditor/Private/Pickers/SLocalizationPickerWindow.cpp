#include "SLocalizationPickerWindow.h"
#include "GameScriptDatabase.h"

void SLocalizationPickerWindow::LoadItems(TArray<FPickerItem>& OutItems)
{
	LoadItemsFromDatabase(OutItems, &UGameScriptDatabase::EditorGetAllLocalizations);
}
