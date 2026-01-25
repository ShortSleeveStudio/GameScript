#pragma once

#include "BaseIdCustomization.h"

/**
 * Property customization for FLocalizationId.
 * Shows localization key and provides picker/edit buttons.
 */
class FLocalizationIdCustomization : public FBaseIdCustomization
{
public:
	static TSharedRef<IPropertyTypeCustomization> MakeInstance()
	{
		return MakeShareable(new FLocalizationIdCustomization);
	}

protected:
	virtual FString GetDisplayName(int32 Id) const override;
	virtual FString GetEntityType() const override { return TEXT("localization"); }
	virtual void ShowPicker(int32 CurrentValue, TFunction<void(int32)> OnSelected) const override;
};
