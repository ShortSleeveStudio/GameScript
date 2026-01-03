using System;
using System.Collections.Generic;
using UnityEditor;
using UnityEditor.UIElements;
using UnityEngine;
using UnityEngine.UIElements;

namespace GameScript.Editor
{
    /// <summary>
    /// Common window size constants for picker windows.
    /// </summary>
    static class PickerWindowSizes
    {
        public static readonly Vector2 Standard = new(400, 450);
        public static readonly Vector2 WithTags = new(450, 500);
    }

    /// <summary>
    /// Common item struct for pickers with name and localized name.
    /// </summary>
    struct PickerItem
    {
        public int Id;
        public string Name;
        public string SubText;
    }

    /// <summary>
    /// Base class for GameScript picker windows.
    /// Provides common UI structure: search field + optional tag filters + list view.
    /// </summary>
    abstract class BasePickerWindow<TItem> : EditorWindow
    {
        protected const int NoneId = 0;
        protected const string NoneName = "(None)";

        protected Action<int> onSelected;
        protected int currentValue;

        // UI Elements
        ToolbarSearchField searchField;
        ListView listView;
        VisualElement tagFiltersContainer;

        // Data
        protected List<TItem> allItems = new List<TItem>();
        protected List<TItem> filteredItems = new List<TItem>();

        protected abstract string WindowTitle { get; }
        protected abstract Vector2 WindowSize { get; }

        /// <summary>
        /// Whether this picker should include a "None" option at the top.
        /// </summary>
        protected virtual bool IncludeNoneOption => true;

        public static T Show<T>(Rect buttonRect, int currentValue, Action<int> onSelected) where T : BasePickerWindow<TItem>
        {
            T window = CreateInstance<T>();
            window.currentValue = currentValue;
            window.onSelected = onSelected;
            window.titleContent = new GUIContent(window.WindowTitle);

            // Position below the button
            Vector2 windowSize = window.WindowSize;
            Vector2 screenPos = GUIUtility.GUIToScreenPoint(new Vector2(buttonRect.x, buttonRect.yMax));
            window.position = new Rect(screenPos.x, screenPos.y, windowSize.x, windowSize.y);

            window.ShowPopup();
            window.Focus();

            return window;
        }

        void OnEnable()
        {
            LoadItems();
            FilterItems();
        }

        void CreateGUI()
        {
            VisualElement root = rootVisualElement;

            // Load stylesheet
            StyleSheet styleSheet = AssetDatabase.LoadAssetAtPath<StyleSheet>(
                "Packages/studio.shortsleeve.gamescriptunity/Editor/Styles/gamescript-picker.uss"
            );
            if (styleSheet != null)
                root.styleSheets.Add(styleSheet);

            root.AddToClassList("picker-window");

            // Search field
            searchField = new ToolbarSearchField();
            searchField.AddToClassList("picker-search");
            searchField.RegisterValueChangedCallback(evt =>
            {
                FilterItems();
                listView.RefreshItems();
            });
            root.Add(searchField);

            // Tag filters (optional, subclasses add content)
            tagFiltersContainer = new VisualElement();
            tagFiltersContainer.AddToClassList("picker-tags");
            root.Add(tagFiltersContainer);
            CreateTagFilters(tagFiltersContainer);

            // List view
            listView = new ListView();
            listView.AddToClassList("picker-list");
            listView.makeItem = MakeListItem;
            listView.bindItem = BindListItem;
            listView.itemsSource = filteredItems;
            listView.selectionType = SelectionType.Single;
            listView.selectionChanged += OnSelectionChanged;
            listView.showAlternatingRowBackgrounds = AlternatingRowBackground.ContentOnly;
            listView.fixedItemHeight = GetItemHeight();

            // Double-click to select
            listView.RegisterCallback<MouseDownEvent>(evt =>
            {
                if (evt.clickCount == 2)
                    ConfirmSelection();
            });

            root.Add(listView);

            // Focus search field
            searchField.Focus();

            // Close on escape
            root.RegisterCallback<KeyDownEvent>(evt =>
            {
                if (evt.keyCode == KeyCode.Escape)
                    Close();
                else if (evt.keyCode == KeyCode.Return || evt.keyCode == KeyCode.KeypadEnter)
                    ConfirmSelection();
            });
        }

        void OnLostFocus()
        {
            // Close when clicking outside
            Close();
        }

        /// <summary>
        /// Load all items from the snapshot.
        /// </summary>
        protected abstract void LoadItems();

        /// <summary>
        /// Filter items based on search text and tag selections.
        /// Subclasses should call base.FilterItems() which handles the None option.
        /// </summary>
        protected virtual void FilterItems()
        {
            filteredItems.Clear();
            string searchText = searchField?.value?.ToLowerInvariant() ?? "";

            // Add None option first if enabled and matches search
            if (IncludeNoneOption && (string.IsNullOrEmpty(searchText) || NoneName.ToLowerInvariant().Contains(searchText)))
            {
                AddNoneItem();
            }

            foreach (TItem item in allItems)
            {
                if (MatchesFilter(item, searchText))
                    filteredItems.Add(item);
            }
        }

        /// <summary>
        /// Add the None item to filteredItems. Subclasses must implement this.
        /// </summary>
        protected abstract void AddNoneItem();

        /// <summary>
        /// Check if an item matches the current filter criteria.
        /// </summary>
        protected abstract bool MatchesFilter(TItem item, string searchText);

        /// <summary>
        /// Create tag filter dropdowns (optional).
        /// </summary>
        protected virtual void CreateTagFilters(VisualElement container) { }

        /// <summary>
        /// Get the fixed item height for virtualization.
        /// Subclasses with two-line items should override to return a larger height.
        /// </summary>
        protected virtual float GetItemHeight() => 24f;

        /// <summary>
        /// Create a list item visual element.
        /// </summary>
        protected virtual VisualElement MakeListItem()
        {
            VisualElement container = new VisualElement();
            container.AddToClassList("picker-item");

            Label label = new Label();
            label.AddToClassList("picker-item-label");
            container.Add(label);

            return container;
        }

        /// <summary>
        /// Bind data to a list item.
        /// </summary>
        protected abstract void BindListItem(VisualElement element, int index);

        /// <summary>
        /// Get the ID from an item.
        /// </summary>
        protected abstract int GetItemId(TItem item);

        void OnSelectionChanged(IEnumerable<object> selection)
        {
            // Single click just highlights, double-click or Enter confirms
        }

        void ConfirmSelection()
        {
            if (listView.selectedIndex >= 0 && listView.selectedIndex < filteredItems.Count)
            {
                TItem item = filteredItems[listView.selectedIndex];
                onSelected?.Invoke(GetItemId(item));
                Close();
            }
        }

        protected void RefreshList()
        {
            FilterItems();
            listView?.RefreshItems();
        }
    }
}
