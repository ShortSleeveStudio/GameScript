#include "SLocalePickerWindow.h"
#include "GameScriptDatabase.h"

void SLocalePickerWindow::LoadItems(TArray<FPickerItem>& OutItems)
{
	LoadItemsFromDatabase(OutItems, &UGameScriptDatabase::EditorGetAllLocales);
}
