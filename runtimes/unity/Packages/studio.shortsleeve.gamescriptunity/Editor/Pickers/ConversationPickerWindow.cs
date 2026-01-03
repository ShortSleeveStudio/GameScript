using System;
using System.Collections.Generic;
using UnityEngine.UIElements;

namespace GameScript.Editor
{
    /// <summary>
    /// Picker window for selecting a conversation.
    /// Supports tag-based filtering and search.
    /// </summary>
    class ConversationPickerWindow : BaseTaggedPickerWindow<ConversationPickerWindow.Item>
    {
        internal struct Item
        {
            public int Id;
            public string Name;
            public int[] TagIndices;
        }

        static readonly int[] EmptyTagIndices = Array.Empty<int>();

        protected override string WindowTitle => "Select Conversation";

        protected override int GetTagCount(Snapshot snapshot) => snapshot.ConversationTagNames?.Count ?? 0;
        protected override string GetTagName(Snapshot snapshot, int index) => snapshot.ConversationTagNames[index];
        protected override StringArray GetTagValues(Snapshot snapshot, int index) => snapshot.ConversationTagValues[index];
        protected override int[] GetItemTagIndices(Item item) => item.TagIndices;

        protected override void AddNoneItem()
        {
            filteredItems.Add(new Item
            {
                Id = NoneId,
                Name = NoneName,
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

            IList<Conversation> conversations = snapshot.Conversations;
            if (conversations == null)
                return;

            for (int i = 0; i < conversations.Count; i++)
            {
                Conversation conv = conversations[i];
                if (conv == null) continue;

                IList<int> convTagIndices = conv.TagIndices;
                int[] tagIndices = new int[convTagIndices?.Count ?? 0];
                for (int j = 0; j < tagIndices.Length; j++)
                {
                    tagIndices[j] = convTagIndices[j];
                }

                allItems.Add(new Item
                {
                    Id = conv.Id,
                    Name = conv.Name,
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
                if (item.Name.IndexOf(searchText, StringComparison.OrdinalIgnoreCase) < 0)
                    return false;
            }

            return true;
        }

        protected override void BindListItem(VisualElement element, int index)
        {
            Item item = filteredItems[index];
            Label label = element.Q<Label>();
            label.text = item.Name;

            if (item.Id == currentValue)
                element.AddToClassList("picker-item-selected");
            else
                element.RemoveFromClassList("picker-item-selected");
        }

        protected override int GetItemId(Item item) => item.Id;
    }
}
