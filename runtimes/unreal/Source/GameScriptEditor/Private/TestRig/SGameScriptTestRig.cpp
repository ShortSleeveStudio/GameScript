#include "TestRig/SGameScriptTestRig.h"
#include "TestRig/GameScriptTestRigContext.h"
#include "GameScriptManifest.h"
#include "GameScriptDatabase.h"
#include "GSCompletionHandle.h"

#include "Widgets/Layout/SBox.h"
#include "Widgets/Layout/SBorder.h"
#include "Widgets/Layout/SSplitter.h"
#include "Widgets/Layout/SScrollBox.h"
#include "Widgets/Layout/SSpacer.h"
#include "Widgets/Layout/SExpandableArea.h"
#include "Widgets/SBoxPanel.h"
#include "Widgets/Text/STextBlock.h"
#include "Widgets/Input/SButton.h"
#include "Widgets/Input/SComboBox.h"
#include "Framework/Application/SlateApplication.h"
#include "Styling/AppStyle.h"
#include "PropertyEditorModule.h"
#include "IDetailsView.h"
#include "Modules/ModuleManager.h"

#define LOCTEXT_NAMESPACE "GameScriptTestRig"

// Static window handle
TWeakPtr<SWindow> SGameScriptTestRig::TestRigWindow;

SGameScriptTestRig::~SGameScriptTestRig()
{
	Cleanup();
}

void SGameScriptTestRig::Construct(const FArguments& InArgs)
{
	// Create and initialize context
	Context = NewObject<UGameScriptTestRigContext>(GetTransientPackage());
	Context->AddToRoot(); // Prevent GC

	// Bind to context UI updates
	Context->OnUIUpdate.AddSP(this, &SGameScriptTestRig::OnContextUIUpdate);

	// Initialize context (loads manifest, database, runner)
	Context->Initialize();

	// Populate dropdowns
	RebuildConversationList();
	RebuildLocaleList();

	// Build the UI
	ChildSlot
	[
		SNew(SSplitter)
		.Orientation(Orient_Horizontal)
		+ SSplitter::Slot()
		.Value(0.3f)
		[
			BuildControlPanel()
		]
		+ SSplitter::Slot()
		.Value(0.7f)
		[
			BuildDisplayPanel()
		]
	];

	// Initial UI refresh
	RefreshUI();
}

void SGameScriptTestRig::OpenWindow()
{
	// If window already exists, bring to front
	if (TSharedPtr<SWindow> ExistingWindow = TestRigWindow.Pin())
	{
		ExistingWindow->BringToFront();
		return;
	}

	// Create new window
	TSharedRef<SWindow> Window = SNew(SWindow)
		.Title(LOCTEXT("WindowTitle", "GameScript Test Rig"))
		.ClientSize(FVector2D(900, 600))
		.SupportsMinimize(true)
		.SupportsMaximize(true)
		[
			SNew(SGameScriptTestRig)
		];

	TestRigWindow = Window;

	FSlateApplication::Get().AddWindow(Window);
}

void SGameScriptTestRig::CloseWindow()
{
	if (TSharedPtr<SWindow> Window = TestRigWindow.Pin())
	{
		Window->RequestDestroyWindow();
	}
	TestRigWindow.Reset();
}

bool SGameScriptTestRig::IsWindowOpen()
{
	return TestRigWindow.IsValid();
}

TSharedRef<SWidget> SGameScriptTestRig::BuildControlPanel()
{
	// Populate options arrays for ComboBoxes
	RebuildComboBoxOptions();

	return SNew(SBorder)
		.BorderImage(FAppStyle::GetBrush("ToolPanel.GroupBorder"))
		.Padding(8.0f)
		[
			SNew(SVerticalBox)

			// Title
			+ SVerticalBox::Slot()
			.AutoHeight()
			.Padding(0, 0, 0, 10)
			[
				SNew(STextBlock)
				.Text(LOCTEXT("ControlPanelTitle", "Control Panel"))
				.Font(FAppStyle::GetFontStyle("BoldFont"))
			]

			// Conversation label
			+ SVerticalBox::Slot()
			.AutoHeight()
			.Padding(0, 5, 0, 2)
			[
				SNew(STextBlock)
				.Text(LOCTEXT("ConversationLabel", "Conversation:"))
			]

			// Conversation dropdown
			+ SVerticalBox::Slot()
			.AutoHeight()
			.Padding(0, 0, 0, 10)
			[
				SAssignNew(ConversationComboBox, SComboBox<TSharedPtr<int32>>)
				.OptionsSource(&ConversationOptions)
				.OnGenerateWidget_Lambda([this](TSharedPtr<int32> Item) -> TSharedRef<SWidget>
				{
					int32 Index = Item.IsValid() ? *Item : 0;
					FString DisplayText = (Index >= 0 && Index < ConversationList.Num())
						? ConversationList[Index].Value
						: TEXT("(None)");
					return SNew(STextBlock).Text(FText::FromString(DisplayText));
				})
				.OnSelectionChanged_Lambda([this](TSharedPtr<int32> Item, ESelectInfo::Type)
				{
					if (Item.IsValid())
					{
						OnConversationSelected(*Item);
					}
				})
				[
					SNew(STextBlock)
					.Text_Lambda([this]() -> FText
					{
						if (SelectedConversationIndex >= 0 && SelectedConversationIndex < ConversationList.Num())
						{
							return FText::FromString(ConversationList[SelectedConversationIndex].Value);
						}
						return LOCTEXT("SelectConversation", "Select Conversation...");
					})
				]
			]

			// Locale label
			+ SVerticalBox::Slot()
			.AutoHeight()
			.Padding(0, 5, 0, 2)
			[
				SNew(STextBlock)
				.Text(LOCTEXT("LocaleLabel", "Locale:"))
			]

			// Locale dropdown
			+ SVerticalBox::Slot()
			.AutoHeight()
			.Padding(0, 0, 0, 10)
			[
				SAssignNew(LocaleComboBox, SComboBox<TSharedPtr<int32>>)
				.OptionsSource(&LocaleOptions)
				.OnGenerateWidget_Lambda([this](TSharedPtr<int32> Item) -> TSharedRef<SWidget>
				{
					int32 Index = Item.IsValid() ? *Item : 0;
					FString DisplayText = (Index >= 0 && Index < LocaleList.Num())
						? LocaleList[Index].Value
						: TEXT("(None)");
					return SNew(STextBlock).Text(FText::FromString(DisplayText));
				})
				.OnSelectionChanged_Lambda([this](TSharedPtr<int32> Item, ESelectInfo::Type)
				{
					if (Item.IsValid())
					{
						OnLocaleSelected(*Item);
					}
				})
				[
					SNew(STextBlock)
					.Text_Lambda([this]() -> FText
					{
						if (SelectedLocaleIndex >= 0 && SelectedLocaleIndex < LocaleList.Num())
						{
							return FText::FromString(LocaleList[SelectedLocaleIndex].Value);
						}
						return LOCTEXT("SelectLocale", "Select Locale...");
					})
				]
			]

			// Buttons row
			+ SVerticalBox::Slot()
			.AutoHeight()
			.Padding(0, 10, 0, 5)
			[
				SNew(SHorizontalBox)

				+ SHorizontalBox::Slot()
				.FillWidth(1.0f)
				.Padding(0, 0, 5, 0)
				[
					SNew(SButton)
					.Text(LOCTEXT("StartButton", "Start"))
					.OnClicked(this, &SGameScriptTestRig::OnStartClicked)
					.IsEnabled_Lambda([this]() -> bool
					{
						return Context && Context->GetState() == ETestRigState::Ready
							&& SelectedConversationIndex >= 0
							&& SelectedConversationIndex < ConversationList.Num();
					})
				]

				+ SHorizontalBox::Slot()
				.FillWidth(1.0f)
				[
					SNew(SButton)
					.Text(LOCTEXT("StopButton", "Stop"))
					.OnClicked(this, &SGameScriptTestRig::OnStopClicked)
					.IsEnabled_Lambda([this]() -> bool
					{
						return Context && (Context->GetState() == ETestRigState::Running
							|| Context->GetState() == ETestRigState::WaitingForChoice);
					})
				]
			]

			// Clear button
			+ SVerticalBox::Slot()
			.AutoHeight()
			.Padding(0, 5, 0, 10)
			[
				SNew(SButton)
				.Text(LOCTEXT("ClearButton", "Clear History"))
				.OnClicked(this, &SGameScriptTestRig::OnClearClicked)
			]

			// Status label
			+ SVerticalBox::Slot()
			.AutoHeight()
			.Padding(0, 5, 0, 2)
			[
				SNew(STextBlock)
				.Text(LOCTEXT("StatusLabel", "Status:"))
			]

			// Status text
			+ SVerticalBox::Slot()
			.AutoHeight()
			[
				SNew(STextBlock)
				.Text(this, &SGameScriptTestRig::GetStatusText)
				.ColorAndOpacity(this, &SGameScriptTestRig::GetStatusColor)
			]

			// Spacer
			+ SVerticalBox::Slot()
			.AutoHeight()
			.Padding(0, 10, 0, 0)
			[
				SNew(SSpacer)
				.Size(FVector2D(1, 10))
			]

			// Test ID Pickers Section
			+ SVerticalBox::Slot()
			.AutoHeight()
			.Padding(0, 5, 0, 0)
			[
				SNew(SExpandableArea)
				.HeaderPadding(FMargin(2.0f))
				.Padding(FMargin(4.0f))
				.InitiallyCollapsed(true)
				.HeaderContent()
				[
					SNew(STextBlock)
					.Text(LOCTEXT("TestIDsHeader", "Test ID Pickers"))
					.Font(FAppStyle::GetFontStyle("BoldFont"))
				]
				.BodyContent()
				[
					SNew(SBox)
					.MinDesiredHeight(200.0f)
					.MaxDesiredHeight(400.0f)
					[
						CreateTestIDsDetailsView()
					]
				]
			]

			// Spacer to push everything up
			+ SVerticalBox::Slot()
			.FillHeight(1.0f)
			[
				SNew(SSpacer)
			]
		];
}

TSharedRef<SWidget> SGameScriptTestRig::CreateTestIDsDetailsView()
{
	// Create the details view
	FPropertyEditorModule& PropertyModule = FModuleManager::LoadModuleChecked<FPropertyEditorModule>("PropertyEditor");

	FDetailsViewArgs Args;
	Args.bAllowSearch = false;
	Args.bHideSelectionTip = true;
	Args.bShowOptions = false;
	Args.bShowModifiedPropertiesOption = false;
	Args.bShowObjectLabel = false;
	Args.NameAreaSettings = FDetailsViewArgs::HideNameArea;

	TestIDsDetailsView = PropertyModule.CreateDetailView(Args);
	TestIDsDetailsView->SetObject(Context);

	return TestIDsDetailsView.ToSharedRef();
}

TSharedRef<SWidget> SGameScriptTestRig::BuildDisplayPanel()
{
	return SNew(SBorder)
		.BorderImage(FAppStyle::GetBrush("ToolPanel.GroupBorder"))
		.Padding(8.0f)
		[
			SNew(SVerticalBox)

			// Title
			+ SVerticalBox::Slot()
			.AutoHeight()
			.Padding(0, 0, 0, 10)
			[
				SNew(STextBlock)
				.Text(LOCTEXT("DisplayPanelTitle", "Conversation"))
				.Font(FAppStyle::GetFontStyle("BoldFont"))
			]

			// History scroll box
			+ SVerticalBox::Slot()
			.FillHeight(1.0f)
			.Padding(0, 0, 0, 10)
			[
				SNew(SBorder)
				.BorderImage(FAppStyle::GetBrush("ToolPanel.DarkGroupBorder"))
				.Padding(4.0f)
				[
					SAssignNew(HistoryScrollBox, SScrollBox)
					+ SScrollBox::Slot()
					[
						SAssignNew(HistoryContainer, SVerticalBox)
					]
				]
			]

			// Choices section header
			+ SVerticalBox::Slot()
			.AutoHeight()
			.Padding(0, 0, 0, 5)
			[
				SNew(STextBlock)
				.Text(LOCTEXT("ChoicesLabel", "Choices:"))
				.Visibility_Lambda([this]() -> EVisibility
				{
					return (Context && Context->GetCurrentChoices().Num() > 0)
						? EVisibility::Visible
						: EVisibility::Collapsed;
				})
			]

			// Choices container
			+ SVerticalBox::Slot()
			.AutoHeight()
			[
				SAssignNew(ChoicesContainer, SVerticalBox)
			]
		];
}

void SGameScriptTestRig::RebuildConversationList()
{
	ConversationList.Empty();

	if (!Context || !Context->GetDatabase())
	{
		return;
	}

	UGameScriptDatabase* Database = Context->GetDatabase();
	int32 ConvCount = Database->GetConversationCount();

	for (int32 i = 0; i < ConvCount; i++)
	{
		FConversationRef Conv = Database->GetConversationByIndex(i);
		if (Conv.IsValid())
		{
			int32 Id = Conv.GetId();
			FString Name = Conv.GetName();
			if (Name.IsEmpty())
			{
				Name = FString::Printf(TEXT("Conversation %d"), Id);
			}
			ConversationList.Add(TPair<int32, FString>(Id, Name));
		}
	}

	// Sort by name
	ConversationList.Sort([](const TPair<int32, FString>& A, const TPair<int32, FString>& B)
	{
		return A.Value < B.Value;
	});
}

void SGameScriptTestRig::RebuildLocaleList()
{
	LocaleList.Empty();

	if (!Context || !Context->GetManifest())
	{
		return;
	}

	UGameScriptManifest* Manifest = Context->GetManifest();
	int32 LocaleCount = Manifest->GetLocaleCount();

	for (int32 i = 0; i < LocaleCount; i++)
	{
		FLocaleRef Locale = Manifest->GetLocale(i);
		if (Locale.IsValid())
		{
			FString Name = Locale.GetCode();
			if (Name.IsEmpty())
			{
				Name = FString::Printf(TEXT("Locale %d"), i);
			}
			LocaleList.Add(TPair<int32, FString>(i, Name));
		}
	}

	// Set initial selection to current locale
	if (Context)
	{
		SelectedLocaleIndex = Context->GetCurrentLocaleIndex();
	}
}

void SGameScriptTestRig::RebuildComboBoxOptions()
{
	// Rebuild conversation options
	ConversationOptions.Empty();
	for (int32 i = 0; i < ConversationList.Num(); i++)
	{
		ConversationOptions.Add(MakeShared<int32>(i));
	}

	// Rebuild locale options
	LocaleOptions.Empty();
	for (int32 i = 0; i < LocaleList.Num(); i++)
	{
		LocaleOptions.Add(MakeShared<int32>(i));
	}

	// Refresh ComboBox widgets to pick up new options
	if (ConversationComboBox.IsValid())
	{
		ConversationComboBox->RefreshOptions();
		// Set selected item to match SelectedConversationIndex
		if (SelectedConversationIndex >= 0 && SelectedConversationIndex < ConversationOptions.Num())
		{
			ConversationComboBox->SetSelectedItem(ConversationOptions[SelectedConversationIndex]);
		}
	}

	if (LocaleComboBox.IsValid())
	{
		LocaleComboBox->RefreshOptions();
		// Set selected item to match SelectedLocaleIndex
		if (SelectedLocaleIndex >= 0 && SelectedLocaleIndex < LocaleOptions.Num())
		{
			LocaleComboBox->SetSelectedItem(LocaleOptions[SelectedLocaleIndex]);
		}
	}
}

void SGameScriptTestRig::RefreshUI()
{
	RebuildHistory();
	RebuildChoices();
}

void SGameScriptTestRig::RebuildHistory()
{
	if (!HistoryContainer.IsValid() || !Context)
	{
		return;
	}

	HistoryContainer->ClearChildren();

	const TArray<FTestRigHistoryItem>& History = Context->GetHistory();
	for (const FTestRigHistoryItem& Item : History)
	{
		HistoryContainer->AddSlot()
		.AutoHeight()
		.Padding(0, 2, 0, 2)
		[
			SNew(SVerticalBox)

			// Speaker name
			+ SVerticalBox::Slot()
			.AutoHeight()
			[
				SNew(STextBlock)
				.Text(FText::FromString(Item.SpeakerName))
				.Font(FAppStyle::GetFontStyle("BoldFont"))
				.ColorAndOpacity(FSlateColor(FLinearColor(0.7f, 0.85f, 1.0f)))
			]

			// Dialogue text
			+ SVerticalBox::Slot()
			.AutoHeight()
			.Padding(10, 0, 0, 5)
			[
				SNew(STextBlock)
				.Text(FText::FromString(Item.DialogueText))
				.AutoWrapText(true)
			]
		];
	}

	// Scroll to bottom
	if (HistoryScrollBox.IsValid())
	{
		HistoryScrollBox->ScrollToEnd();
	}
}

void SGameScriptTestRig::RebuildChoices()
{
	if (!ChoicesContainer.IsValid() || !Context)
	{
		return;
	}

	ChoicesContainer->ClearChildren();

	const TArray<FNodeRef>& Choices = Context->GetCurrentChoices();
	for (int32 i = 0; i < Choices.Num(); i++)
	{
		const FNodeRef& Choice = Choices[i];
		FString ChoiceText = Choice.GetUIResponseText();
		if (ChoiceText.IsEmpty())
		{
			ChoiceText = FString::Printf(TEXT("[Choice %d]"), i + 1);
		}

		int32 ChoiceIndex = i; // Capture for lambda
		ChoicesContainer->AddSlot()
		.AutoHeight()
		.Padding(0, 2, 0, 2)
		[
			SNew(SButton)
			.Text(FText::FromString(ChoiceText))
			.OnClicked_Lambda([this, ChoiceIndex]() -> FReply
			{
				return OnChoiceClicked(ChoiceIndex);
			})
		];
	}
}

FText SGameScriptTestRig::GetStatusText() const
{
	if (!Context)
	{
		return LOCTEXT("StatusNotInit", "Not Initialized");
	}

	switch (Context->GetState())
	{
	case ETestRigState::NotInitialized:
		return LOCTEXT("StatusNotInitialized", "Not Initialized");
	case ETestRigState::Ready:
		return LOCTEXT("StatusReady", "Ready");
	case ETestRigState::Running:
		return LOCTEXT("StatusRunning", "Running...");
	case ETestRigState::WaitingForChoice:
		return LOCTEXT("StatusWaiting", "Waiting for Choice");
	case ETestRigState::Error:
		{
			const FString& Err = Context->GetErrorMessage();
			return FText::FromString(Err.IsEmpty() ? TEXT("Error") : Err);
		}
	default:
		return LOCTEXT("StatusUnknown", "Unknown");
	}
}

FSlateColor SGameScriptTestRig::GetStatusColor() const
{
	if (!Context)
	{
		return FSlateColor(FLinearColor::Gray);
	}

	switch (Context->GetState())
	{
	case ETestRigState::NotInitialized:
		return FSlateColor(FLinearColor::Gray);
	case ETestRigState::Ready:
		return FSlateColor(FLinearColor::Green);
	case ETestRigState::Running:
		return FSlateColor(FLinearColor::Yellow);
	case ETestRigState::WaitingForChoice:
		return FSlateColor(FLinearColor(0.5f, 0.8f, 1.0f)); // Light blue
	case ETestRigState::Error:
		return FSlateColor(FLinearColor::Red);
	default:
		return FSlateColor(FLinearColor::Gray);
	}
}

void SGameScriptTestRig::OnConversationSelected(int32 Index)
{
	// Guard against re-entry (SetSelectedItem triggers OnSelectionChanged)
	static bool bIsChangingConversation = false;
	if (bIsChangingConversation)
	{
		return;
	}
	bIsChangingConversation = true;
	SelectedConversationIndex = Index;
	bIsChangingConversation = false;
}

void SGameScriptTestRig::OnLocaleSelected(int32 Index)
{
	// Guard against re-entry (SetSelectedItem triggers OnSelectionChanged which calls this again)
	static bool bIsChangingLocale = false;
	if (bIsChangingLocale)
	{
		return;
	}

	if (Context && Index >= 0 && Index < LocaleList.Num())
	{
		bIsChangingLocale = true;

		// Attempt to change locale (can fail)
		Context->ChangeLocale(Index);

		// Sync UI to actual locale (may be unchanged if ChangeLocale failed)
		SelectedLocaleIndex = Context->GetCurrentLocaleIndex();

		// Repopulate conversation list after locale change
		RebuildConversationList();

		// Rebuild ComboBox options to match new list size
		RebuildComboBoxOptions();

		// Reset conversation selection since list may have reordered
		SelectedConversationIndex = ConversationList.Num() > 0 ? 0 : -1;

		bIsChangingLocale = false;
	}
}

FReply SGameScriptTestRig::OnStartClicked()
{
	if (Context && SelectedConversationIndex >= 0 && SelectedConversationIndex < ConversationList.Num())
	{
		int32 ConversationId = ConversationList[SelectedConversationIndex].Key;
		Context->StartConversation(ConversationId);
	}
	return FReply::Handled();
}

FReply SGameScriptTestRig::OnStopClicked()
{
	if (Context)
	{
		Context->StopConversation();
	}
	return FReply::Handled();
}

FReply SGameScriptTestRig::OnClearClicked()
{
	if (Context)
	{
		Context->ClearHistory();
	}
	return FReply::Handled();
}

FReply SGameScriptTestRig::OnChoiceClicked(int32 ChoiceIndex)
{
	if (Context)
	{
		// Validate choice index
		const TArray<FNodeRef>& Choices = Context->GetCurrentChoices();
		if (ChoiceIndex < 0 || ChoiceIndex >= Choices.Num())
		{
			return FReply::Handled();
		}

		UGSCompletionHandle* Handle = Context->GetCurrentHandle();
		if (Handle && Handle->IsValid())
		{
			Handle->SelectChoiceByIndex(ChoiceIndex);
			Context->ClearChoices();
			Context->SetCurrentHandle(nullptr);
			Context->NotifyUIUpdate();
		}
	}
	return FReply::Handled();
}

void SGameScriptTestRig::OnContextUIUpdate()
{
	RefreshUI();
}

void SGameScriptTestRig::Cleanup()
{
	if (Context)
	{
		Context->OnUIUpdate.RemoveAll(this);
		Context->Shutdown();
		Context->RemoveFromRoot();
		Context = nullptr;
	}
}

#undef LOCTEXT_NAMESPACE
