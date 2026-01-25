#include "BaseIdCustomization.h"
#include "DetailWidgetRow.h"
#include "DetailLayoutBuilder.h"
#include "GameScriptDatabase.h"
#include "GameScriptCommand.h"
#include "GameScriptSettings.h"
#include "Widgets/Text/STextBlock.h"
#include "Widgets/Input/SButton.h"
#include "Widgets/Layout/SBox.h"
#include "ISourceCodeAccessModule.h"
#include "ISourceCodeAccessor.h"
#include "Modules/ModuleManager.h"
#include "Misc/Paths.h"
#include "HAL/PlatformProcess.h"

#define LOCTEXT_NAMESPACE "GameScriptEditor"

void FBaseIdCustomization::CustomizeHeader(TSharedRef<IPropertyHandle> PropertyHandle, FDetailWidgetRow& HeaderRow, IPropertyTypeCustomizationUtils& CustomizationUtils)
{
	// Get the "Value" property (all ID structs have an int32 Value field)
	ValuePropertyHandle = PropertyHandle->GetChildHandle(TEXT("Value"));
	if (!ValuePropertyHandle.IsValid())
	{
		return;
	}

	// Get current value
	int32 CurrentId = 0;
	ValuePropertyHandle->GetValue(CurrentId);

	// Create name label
	NameLabel = SNew(STextBlock)
		.Font(IDetailLayoutBuilder::GetDetailFont());

	UpdateNameLabel(CurrentId);

	// Create buttons
	PickerButton = CreateButton(
		LOCTEXT("PickerButton", "..."),
		LOCTEXT("PickerButtonTooltip", "Select"),
		[this]() { return OnPickerClicked(); }
	);

	ClearButton = CreateButton(
		LOCTEXT("ClearButton", "×"),
		LOCTEXT("ClearButtonTooltip", "Clear"),
		[this]() { return OnClearClicked(); }
	);

	EditButton = CreateButton(
		LOCTEXT("EditButton", "✎"),
		LOCTEXT("EditButtonTooltip", "Open in GameScript Editor (launches your configured IDE)"),
		[this]() { return OnEditClicked(); }
	);

	// Set initial button visibility
	UpdateButtons(CurrentId);

	// Listen for property changes
	ValuePropertyHandle->SetOnPropertyValueChanged(FSimpleDelegate::CreateSP(this, &FBaseIdCustomization::OnValueChanged));

	// Build the UI
	HeaderRow
		.NameContent()
		[
			PropertyHandle->CreatePropertyNameWidget()
		]
		.ValueContent()
		.MinDesiredWidth(250.0f)
		.MaxDesiredWidth(600.0f)
		[
			SNew(SHorizontalBox)

			// Name display (grows to fill space)
			+ SHorizontalBox::Slot()
			.FillWidth(1.0f)
			.VAlign(VAlign_Center)
			.Padding(2.0f, 0.0f)
			[
				SNew(SBorder)
				.BorderImage(FAppStyle::GetBrush("ToolPanel.GroupBorder"))
				.Padding(FMargin(4.0f, 2.0f))
				[
					NameLabel.ToSharedRef()
				]
			]

			// Picker button (visible when no value)
			+ SHorizontalBox::Slot()
			.AutoWidth()
			.VAlign(VAlign_Center)
			.Padding(2.0f, 0.0f)
			[
				PickerButton.ToSharedRef()
			]

			// Clear button (visible when has value)
			+ SHorizontalBox::Slot()
			.AutoWidth()
			.VAlign(VAlign_Center)
			.Padding(2.0f, 0.0f)
			[
				ClearButton.ToSharedRef()
			]

			// Edit button (visible when has value)
			+ SHorizontalBox::Slot()
			.AutoWidth()
			.VAlign(VAlign_Center)
			.Padding(2.0f, 0.0f)
			[
				EditButton.ToSharedRef()
			]
		];
}

void FBaseIdCustomization::CustomizeChildren(TSharedRef<IPropertyHandle> PropertyHandle, IDetailChildrenBuilder& ChildBuilder, IPropertyTypeCustomizationUtils& CustomizationUtils)
{
	// No children to customize (ID structs only have a single Value field)
}

TSharedRef<SWidget> FBaseIdCustomization::CreateButton(const FText& ButtonText, const FText& Tooltip, TFunction<FReply()> OnClicked) const
{
	return SNew(SButton)
		.ButtonStyle(FAppStyle::Get(), "SimpleButton")
		.ToolTipText(Tooltip)
		.ContentPadding(FMargin(4.0f, 2.0f))
		.OnClicked_Lambda(OnClicked)
		[
			SNew(STextBlock)
			.Font(IDetailLayoutBuilder::GetDetailFont())
			.Text(ButtonText)
		];
}

void FBaseIdCustomization::UpdateNameLabel(int32 Id)
{
	if (!NameLabel.IsValid())
	{
		return;
	}

	// Ensure EditorInstance is up to date (hot-reload check)
	UGameScriptDatabase::CheckForHotReload();

	if (Id == 0)
	{
		NameLabel->SetText(LOCTEXT("NoneLabel", "(None)"));
		return;
	}

	FString DisplayName = GetDisplayName(Id);
	if (DisplayName.IsEmpty())
	{
		NameLabel->SetText(FText::Format(LOCTEXT("MissingLabel", "(Missing: {0})"), FText::AsNumber(Id)));
	}
	else
	{
		NameLabel->SetText(FText::FromString(DisplayName));
	}
}

void FBaseIdCustomization::UpdateButtons(int32 Id)
{
	bool bHasValue = (Id != 0);

	// Show picker when no value, show clear+edit when has value
	if (PickerButton.IsValid())
	{
		PickerButton->SetVisibility(bHasValue ? EVisibility::Collapsed : EVisibility::Visible);
	}

	if (ClearButton.IsValid())
	{
		ClearButton->SetVisibility(bHasValue ? EVisibility::Visible : EVisibility::Collapsed);
	}

	if (EditButton.IsValid())
	{
		EditButton->SetVisibility(bHasValue ? EVisibility::Visible : EVisibility::Collapsed);
	}
}

FReply FBaseIdCustomization::OnClearClicked()
{
	if (ValuePropertyHandle.IsValid())
	{
		ValuePropertyHandle->SetValue(0);
	}
	return FReply::Handled();
}

FReply FBaseIdCustomization::OnPickerClicked()
{
	if (!ValuePropertyHandle.IsValid())
	{
		return FReply::Handled();
	}

	int32 CurrentValue = 0;
	ValuePropertyHandle->GetValue(CurrentValue);

	// Show picker (to be implemented in Phase 4)
	ShowPicker(CurrentValue, [this](int32 SelectedId)
	{
		if (ValuePropertyHandle.IsValid())
		{
			ValuePropertyHandle->SetValue(SelectedId);
		}
	});

	return FReply::Handled();
}

FReply FBaseIdCustomization::OnEditClicked()
{
	if (!ValuePropertyHandle.IsValid())
	{
		return FReply::Handled();
	}

	int32 CurrentValue = 0;
	ValuePropertyHandle->GetValue(CurrentValue);

	if (CurrentValue == 0)
	{
		return FReply::Handled();
	}

	// 1. Write IPC command for GameScript extension to navigate to the entity
	FGameScriptCommandWriter::Navigate(GetEntityType(), CurrentValue);

	// 2. Launch/focus the IDE (Godot-style approach with configurable executable path)
	// The GameScript extension will pick up the command.tmp file and navigate
	const UGameScriptSettings* Settings = GetDefault<UGameScriptSettings>();

	if (Settings && !Settings->IDEExecutablePath.IsEmpty())
	{
		FString IDEPath = Settings->IDEExecutablePath.Path;

		// Detect IDE type from path
		bool bIsVSCode = IDEPath.Contains(TEXT("Code")) || IDEPath.Contains(TEXT("code"));
		bool bIsRider = IDEPath.Contains(TEXT("Rider")) || IDEPath.Contains(TEXT("rider"));

		// VS Code: pass project directory to focus correct window
		// Rider: pass .uproject file to focus correct workspace
		// Other: no arguments
		FString Arguments;
		FString ProjectDir = FPaths::ProjectDir();

		if (bIsVSCode)
		{
			Arguments = FString::Printf(TEXT("\"%s\""), *ProjectDir);
		}
		else if (bIsRider)
		{
			// Find .uproject file
			TArray<FString> UProjectFiles;
			IFileManager::Get().FindFiles(UProjectFiles, *(ProjectDir / TEXT("*.uproject")), true, false);
			if (UProjectFiles.Num() > 0)
			{
				FString UProjectPath = ProjectDir / UProjectFiles[0];
				Arguments = FString::Printf(TEXT("\"%s\""), *UProjectPath);
			}
		}

		// On Mac, .app bundles need to be launched with 'open -a'
		#if PLATFORM_MAC
			if (IDEPath.EndsWith(TEXT(".app")))
			{
				if (Arguments.IsEmpty())
				{
					FPlatformProcess::CreateProc(TEXT("/usr/bin/open"), *FString::Printf(TEXT("-a \"%s\""), *IDEPath), true, false, false, nullptr, 0, nullptr, nullptr);
				}
				else
				{
					FPlatformProcess::CreateProc(TEXT("/usr/bin/open"), *FString::Printf(TEXT("-a \"%s\" %s"), *IDEPath, *Arguments), true, false, false, nullptr, 0, nullptr, nullptr);
				}
			}
			else
			{
				FPlatformProcess::CreateProc(*IDEPath, *Arguments, true, false, false, nullptr, 0, nullptr, nullptr);
			}
		#else
			// Windows/Linux - launch directly
			FPlatformProcess::CreateProc(*IDEPath, *Arguments, true, false, false, nullptr, 0, nullptr, nullptr);
		#endif
	}
	else
	{
		// Fallback: Use Unreal's SourceCodeAccess (may open new windows on Mac)
		ISourceCodeAccessModule& SourceCodeAccessModule = FModuleManager::LoadModuleChecked<ISourceCodeAccessModule>("SourceCodeAccess");
		ISourceCodeAccessor& SourceCodeAccessor = SourceCodeAccessModule.GetAccessor();

		if (SourceCodeAccessor.CanAccessSourceCode())
		{
			SourceCodeAccessor.OpenSolution();
		}
	}

	return FReply::Handled();
}

void FBaseIdCustomization::OnValueChanged()
{
	if (!ValuePropertyHandle.IsValid())
	{
		return;
	}

	int32 NewValue = 0;
	ValuePropertyHandle->GetValue(NewValue);

	UpdateNameLabel(NewValue);
	UpdateButtons(NewValue);
}

void FBaseIdCustomization::ShowPicker(int32 CurrentValue, TFunction<void(int32)> OnSelected) const
{
	// ShowPicker should be implemented by derived classes
}

#undef LOCTEXT_NAMESPACE
