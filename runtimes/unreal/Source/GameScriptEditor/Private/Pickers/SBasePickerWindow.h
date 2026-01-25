#pragma once

#include "CoreMinimal.h"
#include "Widgets/SCompoundWidget.h"
#include "Widgets/Views/SListView.h"
#include "GameScriptDatabase.h"

/**
 * Item struct for picker list views.
 * Simple struct with ID and display name.
 */
struct FPickerItem
{
	int32 Id = 0;
	FString Name;
	FString SubText;

	FPickerItem() = default;
	FPickerItem(int32 InId, const FString& InName, const FString& InSubText = FString())
		: Id(InId), Name(InName), SubText(InSubText)
	{
	}
};

/**
 * Base class for GameScript picker windows.
 * Provides common UI structure: search field + list view + selection handling.
 *
 * Derived classes override:
 * - GetWindowTitle() - Window title text
 * - LoadItems() - Populate allItems array from database
 * - MakeListItemWidget() - Create widget for list item
 * - IncludeNoneOption() - Whether to show "(None)" at top
 */
class SBasePickerWindow : public SCompoundWidget
{
public:
	SLATE_BEGIN_ARGS(SBasePickerWindow) {}
		SLATE_ARGUMENT(int32, CurrentValue)
		SLATE_EVENT(FSimpleDelegate, OnSelectionChanged)
	SLATE_END_ARGS()

	/** Construct the widget. */
	void Construct(const FArguments& InArgs);

	/** Show the picker window as a popup. */
	static TSharedPtr<SWindow> ShowPicker(
		TSharedRef<SWidget> ParentWidget,
		int32 CurrentValue,
		TFunction<void(int32)> OnSelected,
		TSharedRef<SBasePickerWindow> PickerContent
	);

	/** Get the currently selected ID. */
	int32 GetSelectedId() const { return SelectedId; }

protected:
	/** Override in derived classes. */
	virtual FText GetWindowTitle() const = 0;
	virtual void LoadItems(TArray<FPickerItem>& OutItems) = 0;
	virtual bool IncludeNoneOption() const { return true; }

	/**
	 * Template helper to load items from database.
	 * Eliminates code duplication across all picker implementations.
	 *
	 * @param OutItems Array to populate with picker items
	 * @param Getter Function pointer to database getter (e.g., &UGameScriptDatabase::EditorGetAllConversations)
	 */
	template<typename TGetterFunc>
	static void LoadItemsFromDatabase(TArray<FPickerItem>& OutItems, TGetterFunc Getter)
	{
		UGameScriptDatabase::CheckForHotReload();
		TArray<int32> Ids;
		TArray<FString> Names;

		if (Getter(Ids, Names))
		{
			OutItems.Reserve(Ids.Num());
			for (int32 i = 0; i < Ids.Num(); i++)
			{
				OutItems.Add(FPickerItem(Ids[i], Names[i]));
			}
		}
	}

	/** Create list row widget (called by list view). */
	virtual TSharedRef<ITableRow> MakeListRowWidget(TSharedPtr<FPickerItem> Item, const TSharedRef<STableViewBase>& OwnerTable);

	/** Filter items based on search text (can be overridden for custom filtering). */
	virtual bool MatchesFilter(const FPickerItem& Item, const FString& SearchText) const;

	/** Handle selection. */
	void OnItemSelected(TSharedPtr<FPickerItem> Item, ESelectInfo::Type SelectInfo);
	void OnItemDoubleClicked(TSharedPtr<FPickerItem> Item);

	/** Search handling. */
	void OnSearchTextChanged(const FText& InSearchText);
	void FilterItems();

	/** Keyboard navigation. */
	virtual FReply OnKeyDown(const FGeometry& MyGeometry, const FKeyEvent& InKeyEvent) override;

private:
	/** Data. */
	TArray<TSharedPtr<FPickerItem>> AllItems;
	TArray<TSharedPtr<FPickerItem>> FilteredItems;
	int32 CurrentValue = 0;
	int32 SelectedId = 0;
	FString SearchText;

	/** Widgets. */
	TSharedPtr<SListView<TSharedPtr<FPickerItem>>> ListView;
	TWeakPtr<SWindow> ParentWindow;

	/** Callback. */
	FSimpleDelegate OnSelectionChanged;

	/** Close the window. */
	void CloseWindow();
};
