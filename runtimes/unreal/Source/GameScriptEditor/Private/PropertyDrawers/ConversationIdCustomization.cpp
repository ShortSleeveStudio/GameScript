#include "ConversationIdCustomization.h"
#include "GameScriptDatabase.h"
#include "Pickers/SConversationPickerWindow.h"
#include "Pickers/SBasePickerWindow.h"
#include "Widgets/SWindow.h"

FString FConversationIdCustomization::GetDisplayName(int32 Id) const
{
	return UGameScriptDatabase::EditorGetConversationName(Id);
}

void FConversationIdCustomization::ShowPicker(int32 CurrentValue, TFunction<void(int32)> OnSelected) const
{
	// Create the picker widget
	TSharedRef<SConversationPickerWindow> PickerWidget = SNew(SConversationPickerWindow)
		.CurrentValue(CurrentValue);

	// Show as popup window
	SBasePickerWindow::ShowPicker(
		SNullWidget::NullWidget,
		CurrentValue,
		OnSelected,
		PickerWidget
	);
}
