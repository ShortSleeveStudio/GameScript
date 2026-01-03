using System.Collections.Generic;
using UnityEngine;
using UnityEngine.UIElements;

namespace GameScript.Editor
{
    /// <summary>
    /// Base class for picker windows that support tag-based filtering.
    /// Handles tag loading, filter UI creation, and tag matching.
    /// </summary>
    abstract class BaseTaggedPickerWindow<TItem> : BasePickerWindow<TItem>
    {
        protected override Vector2 WindowSize => PickerWindowSizes.WithTags;

        // Tag filter state
        protected List<string> tagNames = new List<string>();
        protected List<List<string>> tagValues = new List<List<string>>();
        protected int[] selectedTagIndices; // -1 = "All"

        protected abstract int GetTagCount(Snapshot snapshot);
        protected abstract string GetTagName(Snapshot snapshot, int index);
        protected abstract StringArray GetTagValues(Snapshot snapshot, int index);
        protected abstract int[] GetItemTagIndices(TItem item);

        protected void LoadTagCategories(Snapshot snapshot)
        {
            tagNames.Clear();
            tagValues.Clear();

            int tagCount = GetTagCount(snapshot);
            selectedTagIndices = new int[tagCount];

            for (int i = 0; i < tagCount; i++)
            {
                selectedTagIndices[i] = -1; // "All"
                tagNames.Add(GetTagName(snapshot, i));

                List<string> values = new List<string> { "All" };
                StringArray tagValuesArray = GetTagValues(snapshot, i);
                IList<string> tagValuesSource = tagValuesArray?.Values;
                if (tagValuesSource != null)
                {
                    for (int j = 0; j < tagValuesSource.Count; j++)
                    {
                        values.Add(tagValuesSource[j]);
                    }
                }
                tagValues.Add(values);
            }
        }

        protected override void CreateTagFilters(VisualElement container)
        {
            if (tagNames.Count == 0)
                return;

            for (int i = 0; i < tagNames.Count; i++)
            {
                int categoryIndex = i;
                DropdownField dropdown = new(tagNames[i], tagValues[i], 0);
                dropdown.AddToClassList("picker-tag-dropdown");
                dropdown.RegisterValueChangedCallback(evt =>
                {
                    // Use the dropdown's index directly instead of searching by value
                    // This avoids issues with duplicate tag names
                    selectedTagIndices[categoryIndex] = dropdown.index - 1; // -1 because "All" is index 0
                    RefreshList();
                });
                container.Add(dropdown);
            }
        }

        protected bool MatchesTagFilter(TItem item)
        {
            int[] itemTagIndices = GetItemTagIndices(item);
            for (int i = 0; i < selectedTagIndices.Length && i < itemTagIndices.Length; i++)
            {
                if (selectedTagIndices[i] != -1 && itemTagIndices[i] != selectedTagIndices[i])
                    return false;
            }
            return true;
        }
    }
}
