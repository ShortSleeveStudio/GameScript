using System;
using UnityEngine;
using UnityEngine.UIElements;

namespace GameScript.Editor
{
    /// <summary>
    /// Base class for picker windows that display items with a name and optional sub-text.
    /// Used by ActorPickerWindow and LocalePickerWindow.
    /// </summary>
    abstract class BaseTwoLinePickerWindow : BasePickerWindow<PickerItem>
    {
        protected override Vector2 WindowSize => PickerWindowSizes.Standard;
        protected override float GetItemHeight() => 40f;

        protected override void AddNoneItem()
        {
            filteredItems.Add(new PickerItem
            {
                Id = NoneId,
                Name = NoneName,
                SubText = ""
            });
        }

        protected override bool MatchesFilter(PickerItem item, string searchText)
        {
            if (string.IsNullOrEmpty(searchText))
                return true;

            bool nameMatch = item.Name.IndexOf(searchText, StringComparison.OrdinalIgnoreCase) >= 0;
            bool subTextMatch = !string.IsNullOrEmpty(item.SubText) &&
                item.SubText.IndexOf(searchText, StringComparison.OrdinalIgnoreCase) >= 0;
            return nameMatch || subTextMatch;
        }

        protected override VisualElement MakeListItem()
        {
            VisualElement container = new VisualElement();
            container.AddToClassList("picker-item");

            Label nameLabel = new Label();
            nameLabel.name = "name";
            nameLabel.AddToClassList("picker-item-label");
            container.Add(nameLabel);

            Label subTextLabel = new Label();
            subTextLabel.name = "subtext";
            subTextLabel.AddToClassList("picker-item-sublabel");
            container.Add(subTextLabel);

            return container;
        }

        protected override void BindListItem(VisualElement element, int index)
        {
            PickerItem item = filteredItems[index];

            Label nameLabel = element.Q<Label>("name");
            nameLabel.text = item.Name;

            Label subTextLabel = element.Q<Label>("subtext");
            subTextLabel.text = item.SubText;
            subTextLabel.style.display = string.IsNullOrEmpty(item.SubText)
                ? DisplayStyle.None
                : DisplayStyle.Flex;

            if (item.Id == currentValue)
                element.AddToClassList("picker-item-selected");
            else
                element.RemoveFromClassList("picker-item-selected");
        }

        protected override int GetItemId(PickerItem item) => item.Id;
    }
}
