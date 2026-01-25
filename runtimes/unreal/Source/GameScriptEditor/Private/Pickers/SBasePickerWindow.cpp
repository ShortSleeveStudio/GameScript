#include "SBasePickerWindow.h"
#include "Widgets/Input/SSearchBox.h"
#include "Widgets/Text/STextBlock.h"
#include "Widgets/Layout/SBorder.h"
#include "Widgets/Layout/SBox.h"
#include "Widgets/SWindow.h"
#include "Framework/Application/SlateApplication.h"

#define LOCTEXT_NAMESPACE "GameScriptEditor"

void SBasePickerWindow::Construct(const FArguments& InArgs)
{
	CurrentValue = InArgs._CurrentValue;
	OnSelectionChanged = InArgs._OnSelectionChanged;
	SelectedId = CurrentValue;

	// Load items from derived class
	TArray<FPickerItem> LoadedItems;
	LoadItems(LoadedItems);

	// Add "None" option if enabled
	AllItems.Empty();
	if (IncludeNoneOption())
	{
		AllItems.Add(MakeShared<FPickerItem>(0, TEXT("(None)"), FString()));
	}

	// Add loaded items
	for (const FPickerItem& Item : LoadedItems)
	{
		AllItems.Add(MakeShared<FPickerItem>(Item));
	}

	// Initialize filtered items
	FilteredItems = AllItems;

	// Create list view
	ListView = SNew(SListView<TSharedPtr<FPickerItem>>)
		.ListItemsSource(&FilteredItems)
		.OnGenerateRow(this, &SBasePickerWindow::MakeListRowWidget)
		.OnSelectionChanged(this, &SBasePickerWindow::OnItemSelected)
		.OnMouseButtonDoubleClick(this, &SBasePickerWindow::OnItemDoubleClicked)
		.SelectionMode(ESelectionMode::Single);

	// Build UI
	ChildSlot
	[
		SNew(SBorder)
		.BorderImage(FAppStyle::GetBrush("ToolPanel.GroupBorder"))
		.Padding(FMargin(4.0f))
		[
			SNew(SVerticalBox)

			// Search box
			+ SVerticalBox::Slot()
			.AutoHeight()
			.Padding(FMargin(0.0f, 0.0f, 0.0f, 4.0f))
			[
				SNew(SSearchBox)
				.OnTextChanged(this, &SBasePickerWindow::OnSearchTextChanged)
			]

			// List view
			+ SVerticalBox::Slot()
			.FillHeight(1.0f)
			[
				SNew(SBox)
				.MinDesiredHeight(300.0f)
				[
					ListView.ToSharedRef()
				]
			]
		]
	];

	// Select current item if found
	for (const TSharedPtr<FPickerItem>& Item : FilteredItems)
	{
		if (Item->Id == CurrentValue)
		{
			ListView->SetSelection(Item);
			ListView->RequestScrollIntoView(Item);
			break;
		}
	}
}

TSharedPtr<SWindow> SBasePickerWindow::ShowPicker(
	TSharedRef<SWidget> ParentWidget,
	int32 CurrentValue,
	TFunction<void(int32)> OnSelected,
	TSharedRef<SBasePickerWindow> PickerContent)
{
	// Create window
	TSharedRef<SWindow> Window = SNew(SWindow)
		.Title(PickerContent->GetWindowTitle())
		.ClientSize(FVector2D(400.0f, 450.0f))
		.SizingRule(ESizingRule::FixedSize)
		.SupportsMaximize(false)
		.SupportsMinimize(false)
		.IsTopmostWindow(true)
		[
			PickerContent
		];

	// Position near parent widget
	FVector2D WindowPosition;
	if (FSlateApplication::IsInitialized())
	{
		FVector2D MousePos = FSlateApplication::Get().GetCursorPos();
		WindowPosition = MousePos - FVector2D(200.0f, 0.0f); // Center horizontally on cursor
	}

	Window->MoveWindowTo(WindowPosition);

	// Store window reference
	PickerContent->ParentWindow = Window;

	// Set selection callback
	PickerContent->OnSelectionChanged.BindLambda([Window, OnSelected, WeakPicker = TWeakPtr<SBasePickerWindow>(PickerContent)]()
	{
		if (TSharedPtr<SBasePickerWindow> Picker = WeakPicker.Pin())
		{
			OnSelected(Picker->GetSelectedId());
			Window->RequestDestroyWindow();
		}
	});

	// Show window
	if (FSlateApplication::IsInitialized())
	{
		FSlateApplication::Get().AddWindow(Window, true);
	}

	return Window;
}

TSharedRef<ITableRow> SBasePickerWindow::MakeListRowWidget(TSharedPtr<FPickerItem> Item, const TSharedRef<STableViewBase>& OwnerTable)
{
	return SNew(STableRow<TSharedPtr<FPickerItem>>, OwnerTable)
		[
			SNew(SBorder)
			.BorderImage(FAppStyle::GetBrush("NoBorder"))
			.Padding(FMargin(4.0f, 2.0f))
			[
				SNew(STextBlock)
				.Text(FText::FromString(Item->Name))
				.Font(FCoreStyle::GetDefaultFontStyle("Regular", 9))
			]
		];
}

bool SBasePickerWindow::MatchesFilter(const FPickerItem& Item, const FString& InSearchText) const
{
	if (InSearchText.IsEmpty())
	{
		return true;
	}

	return Item.Name.Contains(InSearchText);
}

void SBasePickerWindow::OnItemSelected(TSharedPtr<FPickerItem> Item, ESelectInfo::Type SelectInfo)
{
	if (Item.IsValid())
	{
		SelectedId = Item->Id;
	}
}

void SBasePickerWindow::OnItemDoubleClicked(TSharedPtr<FPickerItem> Item)
{
	if (Item.IsValid())
	{
		SelectedId = Item->Id;
		OnSelectionChanged.ExecuteIfBound();
	}
}

void SBasePickerWindow::OnSearchTextChanged(const FText& InSearchText)
{
	SearchText = InSearchText.ToString();
	FilterItems();
}

void SBasePickerWindow::FilterItems()
{
	FilteredItems.Empty();

	for (const TSharedPtr<FPickerItem>& Item : AllItems)
	{
		if (MatchesFilter(*Item, SearchText))
		{
			FilteredItems.Add(Item);
		}
	}

	if (ListView.IsValid())
	{
		ListView->RequestListRefresh();
	}
}

FReply SBasePickerWindow::OnKeyDown(const FGeometry& MyGeometry, const FKeyEvent& InKeyEvent)
{
	// Enter key - select current item
	if (InKeyEvent.GetKey() == EKeys::Enter)
	{
		TArray<TSharedPtr<FPickerItem>> SelectedItems = ListView->GetSelectedItems();
		if (SelectedItems.Num() > 0)
		{
			SelectedId = SelectedItems[0]->Id;
			OnSelectionChanged.ExecuteIfBound();
		}
		return FReply::Handled();
	}

	// Escape key - close without selecting
	if (InKeyEvent.GetKey() == EKeys::Escape)
	{
		CloseWindow();
		return FReply::Handled();
	}

	return SCompoundWidget::OnKeyDown(MyGeometry, InKeyEvent);
}

void SBasePickerWindow::CloseWindow()
{
	if (TSharedPtr<SWindow> Window = ParentWindow.Pin())
	{
		Window->RequestDestroyWindow();
	}
}

#undef LOCTEXT_NAMESPACE
