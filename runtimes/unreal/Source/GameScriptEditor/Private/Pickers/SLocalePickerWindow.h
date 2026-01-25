#pragma once

#include "CoreMinimal.h"
#include "SBasePickerWindow.h"

/**
 * Picker window for selecting a locale.
 */
class SLocalePickerWindow : public SBasePickerWindow
{
public:
	SLATE_BEGIN_ARGS(SLocalePickerWindow) {}
		SLATE_ARGUMENT(int32, CurrentValue)
		SLATE_EVENT(FSimpleDelegate, OnSelectionChanged)
	SLATE_END_ARGS()

	void Construct(const FArguments& InArgs)
	{
		SBasePickerWindow::Construct(SBasePickerWindow::FArguments()
			.CurrentValue(InArgs._CurrentValue)
			.OnSelectionChanged(InArgs._OnSelectionChanged)
		);
	}

protected:
	virtual FText GetWindowTitle() const override
	{
		return FText::FromString(TEXT("Select Locale"));
	}

	virtual void LoadItems(TArray<FPickerItem>& OutItems) override;

	virtual bool IncludeNoneOption() const override { return false; } // Locales should always have a value
};
