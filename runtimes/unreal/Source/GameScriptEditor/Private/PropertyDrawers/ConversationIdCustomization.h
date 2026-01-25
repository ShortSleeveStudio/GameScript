#pragma once

#include "BaseIdCustomization.h"

/**
 * Property customization for FConversationId.
 * Shows conversation name and provides picker/edit buttons.
 */
class FConversationIdCustomization : public FBaseIdCustomization
{
public:
	static TSharedRef<IPropertyTypeCustomization> MakeInstance()
	{
		return MakeShareable(new FConversationIdCustomization);
	}

protected:
	virtual FString GetDisplayName(int32 Id) const override;
	virtual FString GetEntityType() const override { return TEXT("conversation"); }
	virtual void ShowPicker(int32 CurrentValue, TFunction<void(int32)> OnSelected) const override;
};
