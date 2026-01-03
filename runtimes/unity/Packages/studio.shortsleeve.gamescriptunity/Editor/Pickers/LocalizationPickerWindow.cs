using System;
using System.Collections.Generic;
using UnityEngine.UIElements;

namespace GameScript.Editor
{
    /// <summary>
    /// Picker window for selecting a localization.
    /// Supports tag-based filtering and search.
    /// </summary>
    class LocalizationPickerWindow : BaseTaggedPickerWindow<LocalizationPickerWindow.Item>
    {
        const int MaxDisplayTextLength = 60;

        internal struct Item
        {
            public int Id;
            public string Name;
            public string Text;
            public int[] TagIndices;
        }

        static readonly int[] EmptyTagIndices = Array.Empty<int>();

        protected override string WindowTitle => "Select Localization";
        protected override float GetItemHeight() => 40f;

        protected override int GetTagCount(Snapshot snapshot) => snapshot.LocalizationTagNames?.Count ?? 0;
        protected override string GetTagName(Snapshot snapshot, int index) => snapshot.LocalizationTagNames[index];
        protected override StringArray GetTagValues(Snapshot snapshot, int index) => snapshot.LocalizationTagValues[index];
        protected override int[] GetItemTagIndices(Item item) => item.TagIndices;

        protected override void AddNoneItem()
        {
            filteredItems.Add(new Item
            {
                Id = NoneId,
                Name = NoneName,
                Text = "",
                TagIndices = EmptyTagIndices
            });
        }

        protected override void LoadItems()
        {
            allItems.Clear();

            Snapshot snapshot = GameScriptDatabase.EditorGetSnapshot();
            if (snapshot == null)
                return;

            LoadTagCategories(snapshot);

            IList<Localization> localizations = snapshot.Localizations;
            if (localizations == null)
                return;

            for (int i = 0; i < localizations.Count; i++)
            {
                Localization loc = localizations[i];
                if (loc == null) continue;

                IList<int> locTagIndices = loc.TagIndices;
                int[] tagIndices = new int[locTagIndices?.Count ?? 0];
                for (int j = 0; j < tagIndices.Length; j++)
                {
                    tagIndices[j] = locTagIndices[j];
                }

                allItems.Add(new Item
                {
                    Id = loc.Id,
                    Name = loc.Name,
                    Text = loc.Text ?? "",
                    TagIndices = tagIndices
                });
            }
        }

        protected override bool MatchesFilter(Item item, string searchText)
        {
            if (!MatchesTagFilter(item))
                return false;

            if (!string.IsNullOrEmpty(searchText))
            {
                bool nameMatch = item.Name.ToLowerInvariant().Contains(searchText);
                bool textMatch = item.Text.ToLowerInvariant().Contains(searchText);
                if (!nameMatch && !textMatch)
                    return false;
            }

            return true;
        }

        protected override VisualElement MakeListItem()
        {
            VisualElement container = new VisualElement();
            container.AddToClassList("picker-item");

            Label nameLabel = new Label();
            nameLabel.name = "name";
            nameLabel.AddToClassList("picker-item-label");
            container.Add(nameLabel);

            Label textLabel = new Label();
            textLabel.name = "text";
            textLabel.AddToClassList("picker-item-sublabel");
            container.Add(textLabel);

            return container;
        }

        protected override void BindListItem(VisualElement element, int index)
        {
            Item item = filteredItems[index];

            Label nameLabel = element.Q<Label>("name");
            nameLabel.text = item.Name;

            Label textLabel = element.Q<Label>("text");
            string displayText = item.Text.Length > MaxDisplayTextLength
                ? item.Text.Substring(0, MaxDisplayTextLength - 3) + "..."
                : item.Text;
            textLabel.text = displayText;

            if (item.Id == currentValue)
                element.AddToClassList("picker-item-selected");
            else
                element.RemoveFromClassList("picker-item-selected");
        }

        protected override int GetItemId(Item item) => item.Id;
    }
}
