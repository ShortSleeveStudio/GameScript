#pragma once

#include "CoreMinimal.h"
#include "Widgets/SCompoundWidget.h"
#include "Widgets/DeclarativeSyntaxSupport.h"

class UGameScriptTestRigContext;
class SVerticalBox;
class SScrollBox;

/**
 * Main Slate widget for the GameScript Test Rig.
 *
 * Layout:
 * +-----------------------------------+
 * | Control Panel | Conversation UI   |
 * | - Conversation| - History scroll  |
 * | - Locale      | - Current speech  |
 * | - Start/Stop  | - Choice buttons  |
 * | - Status      |                   |
 * +-----------------------------------+
 *
 * Accessible via: Tools -> GameScript -> Test Rig
 */
class SGameScriptTestRig : public SCompoundWidget
{
public:
	SLATE_BEGIN_ARGS(SGameScriptTestRig) {}
	SLATE_END_ARGS()

	/** Destructor - ensures proper cleanup. */
	virtual ~SGameScriptTestRig();

	/** Construct the widget. */
	void Construct(const FArguments& InArgs);

	/** Static method to open the test rig window. */
	static void OpenWindow();

	/** Static method to close the test rig window. */
	static void CloseWindow();

	/** Check if the window is currently open. */
	static bool IsWindowOpen();

private:
	// --- Context ---

	/** Owned context object (GC-protected via AddToRoot). */
	TObjectPtr<UGameScriptTestRigContext> Context;

	// --- Display Panel Widgets ---

	/** History scroll box. */
	TSharedPtr<SScrollBox> HistoryScrollBox;

	/** History content container. */
	TSharedPtr<SVerticalBox> HistoryContainer;

	/** Choices container. */
	TSharedPtr<SVerticalBox> ChoicesContainer;

	/** Details view for testing ID pickers. */
	TSharedPtr<class IDetailsView> TestIDsDetailsView;

	// --- Control Panel Widgets ---

	/** Conversation ComboBox. */
	TSharedPtr<SComboBox<TSharedPtr<int32>>> ConversationComboBox;

	/** Locale ComboBox. */
	TSharedPtr<SComboBox<TSharedPtr<int32>>> LocaleComboBox;

	// --- Data ---

	/** Cached conversation list (id, name pairs). */
	TArray<TPair<int32, FString>> ConversationList;

	/** Cached locale list (index, name pairs). */
	TArray<TPair<int32, FString>> LocaleList;

	/** Options for conversation ComboBox. */
	TArray<TSharedPtr<int32>> ConversationOptions;

	/** Options for locale ComboBox. */
	TArray<TSharedPtr<int32>> LocaleOptions;

	/** Currently selected conversation index in dropdown. */
	int32 SelectedConversationIndex = 0;

	/** Currently selected locale index in dropdown. */
	int32 SelectedLocaleIndex = 0;

	// --- UI Building ---

	/** Build the control panel (left side). */
	TSharedRef<SWidget> BuildControlPanel();

	/** Build the display panel (right side). */
	TSharedRef<SWidget> BuildDisplayPanel();

	/** Create the test IDs details view. */
	TSharedRef<SWidget> CreateTestIDsDetailsView();

	/** Rebuild the conversation dropdown. */
	void RebuildConversationList();

	/** Rebuild the locale dropdown. */
	void RebuildLocaleList();

	/** Rebuild the ComboBox options arrays. */
	void RebuildComboBoxOptions();

	/** Refresh the UI from context state. */
	void RefreshUI();

	/** Rebuild the history display. */
	void RebuildHistory();

	/** Rebuild the choices display. */
	void RebuildChoices();

	/** Get the status text and color. */
	FText GetStatusText() const;
	FSlateColor GetStatusColor() const;

	// --- Event Handlers ---

	/** Called when a conversation is selected. */
	void OnConversationSelected(int32 Index);

	/** Called when a locale is selected. */
	void OnLocaleSelected(int32 Index);

	/** Called when Start button is clicked. */
	FReply OnStartClicked();

	/** Called when Stop button is clicked. */
	FReply OnStopClicked();

	/** Called when Clear button is clicked. */
	FReply OnClearClicked();

	/** Called when a choice button is clicked. */
	FReply OnChoiceClicked(int32 ChoiceIndex);

	/** Called when context requests UI update. */
	void OnContextUIUpdate();

	// --- Cleanup ---

	/** Clean up resources. */
	void Cleanup();

	// --- Static Window Handle ---
	static TWeakPtr<SWindow> TestRigWindow;
};
