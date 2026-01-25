#pragma once

#include "CoreMinimal.h"
#include "IPropertyTypeCustomization.h"
#include "Widgets/Input/SEditableTextBox.h"

/**
 * Property customization for FGSExecutablePath.
 * Provides a text field with a Browse button that opens a native file dialog.
 * On macOS, the dialog allows selecting .app bundles.
 * On Windows, it filters for .exe files.
 */
class FExecutablePathCustomization : public IPropertyTypeCustomization
{
public:
	static TSharedRef<IPropertyTypeCustomization> MakeInstance()
	{
		return MakeShareable(new FExecutablePathCustomization());
	}

	// IPropertyTypeCustomization interface
	virtual void CustomizeHeader(TSharedRef<IPropertyHandle> PropertyHandle, FDetailWidgetRow& HeaderRow, IPropertyTypeCustomizationUtils& CustomizationUtils) override;
	virtual void CustomizeChildren(TSharedRef<IPropertyHandle> PropertyHandle, IDetailChildrenBuilder& ChildBuilder, IPropertyTypeCustomizationUtils& CustomizationUtils) override;

private:
	/** Handle to the Path property */
	TSharedPtr<IPropertyHandle> PathPropertyHandle;

	/** Called when Browse button is clicked */
	FReply OnBrowseClicked();

	/** Called when Clear button is clicked */
	FReply OnClearClicked();

	/** Called when the text is committed */
	void OnPathTextCommitted(const FText& NewText, ETextCommit::Type CommitType);

	/** Get the current path as text */
	FText GetPathText() const;
};
