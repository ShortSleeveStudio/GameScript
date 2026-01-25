#include "LocaleIdCustomization.h"
#include "GameScriptDatabase.h"
#include "Pickers/SLocalePickerWindow.h"
#include "Pickers/SBasePickerWindow.h"
#include "Widgets/SWindow.h"

FString FLocaleIdCustomization::GetDisplayName(int32 Id) const
{
	return UGameScriptDatabase::EditorGetLocaleName(Id);
}

void FLocaleIdCustomization::ShowPicker(int32 CurrentValue, TFunction<void(int32)> OnSelected) const
{
	TSharedRef<SLocalePickerWindow> PickerWidget = SNew(SLocalePickerWindow)
		.CurrentValue(CurrentValue);

	SBasePickerWindow::ShowPicker(
		SNullWidget::NullWidget,
		CurrentValue,
		OnSelected,
		PickerWidget
	);
}
