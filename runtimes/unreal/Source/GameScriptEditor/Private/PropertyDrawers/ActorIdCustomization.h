#pragma once

#include "BaseIdCustomization.h"

/**
 * Property customization for FActorId.
 * Shows actor name and provides picker/edit buttons.
 */
class FActorIdCustomization : public FBaseIdCustomization
{
public:
	static TSharedRef<IPropertyTypeCustomization> MakeInstance()
	{
		return MakeShareable(new FActorIdCustomization);
	}

protected:
	virtual FString GetDisplayName(int32 Id) const override;
	virtual FString GetEntityType() const override { return TEXT("actor"); }
	virtual void ShowPicker(int32 CurrentValue, TFunction<void(int32)> OnSelected) const override;
};
