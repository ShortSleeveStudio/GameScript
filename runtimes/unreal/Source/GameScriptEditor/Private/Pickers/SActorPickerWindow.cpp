#include "SActorPickerWindow.h"
#include "GameScriptDatabase.h"

void SActorPickerWindow::LoadItems(TArray<FPickerItem>& OutItems)
{
	LoadItemsFromDatabase(OutItems, &UGameScriptDatabase::EditorGetAllActors);
}
