#include "ActorIdCustomization.h"
#include "GameScriptDatabase.h"
#include "Pickers/SActorPickerWindow.h"
#include "Pickers/SBasePickerWindow.h"
#include "Widgets/SWindow.h"

FString FActorIdCustomization::GetDisplayName(int32 Id) const
{
	return UGameScriptDatabase::EditorGetActorName(Id);
}

void FActorIdCustomization::ShowPicker(int32 CurrentValue, TFunction<void(int32)> OnSelected) const
{
	TSharedRef<SActorPickerWindow> PickerWidget = SNew(SActorPickerWindow)
		.CurrentValue(CurrentValue);

	SBasePickerWindow::ShowPicker(
		SNullWidget::NullWidget,
		CurrentValue,
		OnSelected,
		PickerWidget
	);
}
