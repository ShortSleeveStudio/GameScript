#pragma once

#include "CoreMinimal.h"
#include "IPropertyTypeCustomization.h"
#include "PropertyHandle.h"

/**
 * Base class for ID struct property customizations.
 * Provides common UI structure: label + name display + action buttons.
 *
 * Layout: [Label] [Entity Name] [...] [×] [✎]
 *
 * Buttons:
 * - "..." opens picker (Phase 4)
 * - "×" clears to 0
 * - "✎" sends IPC command to GameScript editor (Phase 5)
 */
class FBaseIdCustomization : public IPropertyTypeCustomization
{
public:
	// IPropertyTypeCustomization interface
	virtual void CustomizeHeader(TSharedRef<IPropertyHandle> PropertyHandle, FDetailWidgetRow& HeaderRow, IPropertyTypeCustomizationUtils& CustomizationUtils) override;
	virtual void CustomizeChildren(TSharedRef<IPropertyHandle> PropertyHandle, IDetailChildrenBuilder& ChildBuilder, IPropertyTypeCustomizationUtils& CustomizationUtils) override;

protected:
	/** Get the display name for an entity by ID. */
	virtual FString GetDisplayName(int32 Id) const = 0;

	/** Get the entity type name for IPC commands. */
	virtual FString GetEntityType() const = 0;

	/** Show the picker window (implemented in Phase 4). */
	virtual void ShowPicker(int32 CurrentValue, TFunction<void(int32)> OnSelected) const;

private:
	/** Create a button with icon/text. */
	TSharedRef<SWidget> CreateButton(const FText& ButtonText, const FText& Tooltip, TFunction<FReply()> OnClicked) const;

	/** Update the name label text. */
	void UpdateNameLabel(int32 Id);

	/** Update button visibility based on whether we have a value. */
	void UpdateButtons(int32 Id);

	/** Handle clear button click. */
	FReply OnClearClicked();

	/** Handle picker button click. */
	FReply OnPickerClicked();

	/** Handle edit button click. */
	FReply OnEditClicked();

	/** Handle value changed from elsewhere. */
	void OnValueChanged();

	// Cached handles and widgets
	TSharedPtr<IPropertyHandle> ValuePropertyHandle;
	TSharedPtr<STextBlock> NameLabel;
	TSharedPtr<SWidget> PickerButton;
	TSharedPtr<SWidget> ClearButton;
	TSharedPtr<SWidget> EditButton;
};
