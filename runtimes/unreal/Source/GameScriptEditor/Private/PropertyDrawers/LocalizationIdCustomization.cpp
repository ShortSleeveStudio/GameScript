#include "LocalizationIdCustomization.h"
#include "GameScriptDatabase.h"
#include "Pickers/SLocalizationPickerWindow.h"
#include "Pickers/SBasePickerWindow.h"
#include "Widgets/SWindow.h"

FString FLocalizationIdCustomization::GetDisplayName(int32 Id) const
{
	return UGameScriptDatabase::EditorGetLocalizationKey(Id);
}

void FLocalizationIdCustomization::ShowPicker(int32 CurrentValue, TFunction<void(int32)> OnSelected) const
{
	TSharedRef<SLocalizationPickerWindow> PickerWidget = SNew(SLocalizationPickerWindow)
		.CurrentValue(CurrentValue);

	SBasePickerWindow::ShowPicker(
		SNullWidget::NullWidget,
		CurrentValue,
		OnSelected,
		PickerWidget
	);
}
