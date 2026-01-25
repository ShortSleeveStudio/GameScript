#include "ExecutablePathCustomization.h"
#include "DetailWidgetRow.h"
#include "DetailLayoutBuilder.h"
#include "Widgets/Text/STextBlock.h"
#include "Widgets/Input/SButton.h"
#include "Widgets/Input/SEditableTextBox.h"
#include "Widgets/Layout/SBox.h"
#include "DesktopPlatformModule.h"
#include "Framework/Application/SlateApplication.h"

#define LOCTEXT_NAMESPACE "GameScriptEditor"

void FExecutablePathCustomization::CustomizeHeader(TSharedRef<IPropertyHandle> PropertyHandle, FDetailWidgetRow& HeaderRow, IPropertyTypeCustomizationUtils& CustomizationUtils)
{
	// Get the "Path" property from FGSExecutablePath struct
	PathPropertyHandle = PropertyHandle->GetChildHandle(TEXT("Path"));
	if (!PathPropertyHandle.IsValid())
	{
		return;
	}

	HeaderRow
		.NameContent()
		[
			PropertyHandle->CreatePropertyNameWidget()
		]
		.ValueContent()
		.MinDesiredWidth(300.0f)
		.MaxDesiredWidth(600.0f)
		[
			SNew(SHorizontalBox)

			// Editable text box for the path
			+ SHorizontalBox::Slot()
			.FillWidth(1.0f)
			.VAlign(VAlign_Center)
			.Padding(2.0f, 0.0f)
			[
				SNew(SEditableTextBox)
				.Font(IDetailLayoutBuilder::GetDetailFont())
				.Text(this, &FExecutablePathCustomization::GetPathText)
				.OnTextCommitted(this, &FExecutablePathCustomization::OnPathTextCommitted)
				.HintText(LOCTEXT("PathHint", "Path to IDE executable or application"))
			]

			// Browse button
			+ SHorizontalBox::Slot()
			.AutoWidth()
			.VAlign(VAlign_Center)
			.Padding(2.0f, 0.0f)
			[
				SNew(SButton)
				.ButtonStyle(FAppStyle::Get(), "SimpleButton")
				.ToolTipText(LOCTEXT("BrowseTooltip", "Browse for IDE executable"))
				.ContentPadding(FMargin(4.0f, 2.0f))
				.OnClicked(this, &FExecutablePathCustomization::OnBrowseClicked)
				[
					SNew(STextBlock)
					.Font(IDetailLayoutBuilder::GetDetailFont())
					.Text(LOCTEXT("BrowseButton", "..."))
				]
			]

			// Clear button
			+ SHorizontalBox::Slot()
			.AutoWidth()
			.VAlign(VAlign_Center)
			.Padding(2.0f, 0.0f)
			[
				SNew(SButton)
				.ButtonStyle(FAppStyle::Get(), "SimpleButton")
				.ToolTipText(LOCTEXT("ClearTooltip", "Clear path"))
				.ContentPadding(FMargin(4.0f, 2.0f))
				.OnClicked(this, &FExecutablePathCustomization::OnClearClicked)
				[
					SNew(STextBlock)
					.Font(IDetailLayoutBuilder::GetDetailFont())
					.Text(FText::FromString(TEXT("\u00D7"))) // multiplication sign as X
				]
			]
		];
}

void FExecutablePathCustomization::CustomizeChildren(TSharedRef<IPropertyHandle> PropertyHandle, IDetailChildrenBuilder& ChildBuilder, IPropertyTypeCustomizationUtils& CustomizationUtils)
{
	// No children to customize
}

FReply FExecutablePathCustomization::OnBrowseClicked()
{
	IDesktopPlatform* DesktopPlatform = FDesktopPlatformModule::Get();
	if (!DesktopPlatform)
	{
		return FReply::Handled();
	}

	void* ParentWindowHandle = nullptr;
	if (FSlateApplication::IsInitialized())
	{
		TSharedPtr<SWindow> TopLevelWindow = FSlateApplication::Get().GetActiveTopLevelWindow();
		if (TopLevelWindow.IsValid())
		{
			ParentWindowHandle = TopLevelWindow->GetNativeWindow()->GetOSWindowHandle();
		}
	}

#if PLATFORM_MAC
	// On macOS, use directory dialog to select .app bundles (they're technically directories)
	// The standard file dialog treats .app as directories and won't let you select them
	FString SelectedPath;
	bool bOpened = DesktopPlatform->OpenDirectoryDialog(
		ParentWindowHandle,
		TEXT("Select IDE Application (.app)"),
		TEXT("/Applications"),
		SelectedPath
	);

	if (bOpened && !SelectedPath.IsEmpty() && PathPropertyHandle.IsValid())
	{
		PathPropertyHandle->SetValue(SelectedPath);
	}
#else
	// Use standard file dialog on Windows/Linux
	TArray<FString> OutFiles;
	FString DefaultPath = TEXT("C:\\Program Files");

	bool bOpened = DesktopPlatform->OpenFileDialog(
		ParentWindowHandle,
		TEXT("Select IDE Executable"),
		DefaultPath,
		TEXT(""),
		TEXT("Executable Files (*.exe)|*.exe|All Files (*.*)|*.*"),
		EFileDialogFlags::None,
		OutFiles
	);

	if (bOpened && OutFiles.Num() > 0 && PathPropertyHandle.IsValid())
	{
		PathPropertyHandle->SetValue(OutFiles[0]);
	}
#endif

	return FReply::Handled();
}

FReply FExecutablePathCustomization::OnClearClicked()
{
	if (PathPropertyHandle.IsValid())
	{
		PathPropertyHandle->SetValue(FString());
	}
	return FReply::Handled();
}

void FExecutablePathCustomization::OnPathTextCommitted(const FText& NewText, ETextCommit::Type CommitType)
{
	if (PathPropertyHandle.IsValid())
	{
		PathPropertyHandle->SetValue(NewText.ToString());
	}
}

FText FExecutablePathCustomization::GetPathText() const
{
	if (!PathPropertyHandle.IsValid())
	{
		return FText::GetEmpty();
	}

	FString PathValue;
	PathPropertyHandle->GetValue(PathValue);
	return FText::FromString(PathValue);
}

#undef LOCTEXT_NAMESPACE
