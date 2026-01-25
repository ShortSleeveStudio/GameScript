#include "SConversationPickerWindow.h"
#include "GameScriptDatabase.h"

void SConversationPickerWindow::LoadItems(TArray<FPickerItem>& OutItems)
{
	LoadItemsFromDatabase(OutItems, &UGameScriptDatabase::EditorGetAllConversations);
}
