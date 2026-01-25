#pragma once

#include "BaseIdCustomization.h"

/**
 * Property customization for FLocaleId.
 * Shows locale name and provides picker/edit buttons.
 */
class FLocaleIdCustomization : public FBaseIdCustomization
{
public:
	static TSharedRef<IPropertyTypeCustomization> MakeInstance()
	{
		return MakeShareable(new FLocaleIdCustomization);
	}

protected:
	virtual FString GetDisplayName(int32 Id) const override;
	virtual FString GetEntityType() const override { return TEXT("locale"); }
	virtual void ShowPicker(int32 CurrentValue, TFunction<void(int32)> OnSelected) const override;
};
