using System;
using UnityEditor;
using UnityEditor.UIElements;
using UnityEngine;
using UnityEngine.UIElements;

namespace GameScript.Editor
{
    /// <summary>
    /// Base class for ID struct property drawers.
    /// Provides common UI structure: label + name display + action buttons.
    /// </summary>
    abstract class BaseIdDrawer : PropertyDrawer
    {
        const int ButtonWidth = 20;
        const int ButtonSpacing = 2;
        const int FieldHeight = 18;
        const int PaddingHorizontal = 4;
        const int BorderRadius = 3;

        public override VisualElement CreatePropertyGUI(SerializedProperty property)
        {
            SerializedProperty valueProperty = property.FindPropertyRelative("value");
            int currentId = valueProperty.intValue;

            // Use a BaseField-derived element for proper label alignment
            // We'll use a VisualElement with the unity-base-field class structure
            VisualElement root = new VisualElement();
            root.AddToClassList("unity-base-field");
            root.style.flexDirection = FlexDirection.Row;

            // Label with proper Unity alignment
            Label label = new Label(property.displayName);
            label.AddToClassList("unity-text-element");
            label.AddToClassList("unity-label");
            label.AddToClassList("unity-base-field__label");
            root.Add(label);

            // Input container - this is where the value goes
            VisualElement inputContainer = new VisualElement();
            inputContainer.AddToClassList("unity-base-field__input");
            inputContainer.style.flexDirection = FlexDirection.Row;
            inputContainer.style.flexGrow = 1;
            inputContainer.style.alignItems = Align.Center;
            root.Add(inputContainer);

            // Name display
            Label nameLabel = new Label();
            nameLabel.style.flexGrow = 1;
            nameLabel.style.paddingLeft = PaddingHorizontal;
            nameLabel.style.paddingRight = PaddingHorizontal;
            nameLabel.style.backgroundColor = new Color(0, 0, 0, 0.2f);
            nameLabel.style.borderTopLeftRadius = BorderRadius;
            nameLabel.style.borderTopRightRadius = BorderRadius;
            nameLabel.style.borderBottomLeftRadius = BorderRadius;
            nameLabel.style.borderBottomRightRadius = BorderRadius;
            nameLabel.style.overflow = Overflow.Hidden;
            nameLabel.style.unityTextOverflowPosition = TextOverflowPosition.End;
            nameLabel.style.textOverflow = TextOverflow.Ellipsis;
            nameLabel.style.whiteSpace = WhiteSpace.NoWrap;
            nameLabel.style.height = FieldHeight;
            nameLabel.style.unityTextAlign = TextAnchor.MiddleLeft;
            UpdateNameLabel(nameLabel, currentId);
            inputContainer.Add(nameLabel);

            // Create buttons (visibility controlled by UpdateButtons)
            Button pickerButton = CreateButton("...", "Select");
            Button clearButton = CreateButton("×", "Clear");
            Button editButton = CreateButton("✎", "Edit");

            inputContainer.Add(pickerButton);
            inputContainer.Add(clearButton);
            inputContainer.Add(editButton);

            // Picker button action
            pickerButton.clicked += () =>
            {
                Rect buttonRect = pickerButton.worldBound;
                ShowPicker(buttonRect, valueProperty.intValue, id =>
                {
                    valueProperty.intValue = id;
                    valueProperty.serializedObject.ApplyModifiedProperties();
                    UpdateNameLabel(nameLabel, id);
                    UpdateButtons(id, pickerButton, clearButton, editButton);
                });
            };

            // Clear button action
            clearButton.clicked += () =>
            {
                valueProperty.intValue = 0;
                valueProperty.serializedObject.ApplyModifiedProperties();
                UpdateNameLabel(nameLabel, 0);
                UpdateButtons(0, pickerButton, clearButton, editButton);
            };

            // Edit button action
            editButton.clicked += () =>
            {
                GameScriptCommand.Navigate(GetEntityType(), valueProperty.intValue);
            };

            // Set initial button visibility
            UpdateButtons(currentId, pickerButton, clearButton, editButton);

            return root;
        }

        Button CreateButton(string text, string tooltip)
        {
            Button button = new Button();
            button.text = text;
            button.tooltip = tooltip;
            button.style.width = ButtonWidth;
            button.style.height = FieldHeight;
            button.style.paddingLeft = 0;
            button.style.paddingRight = 0;
            button.style.marginLeft = ButtonSpacing;
            button.style.marginRight = 0;
            return button;
        }

        void UpdateButtons(int id, Button pickerButton, Button clearButton, Button editButton)
        {
            bool hasValue = id != 0;

            // Show picker when no value, show clear+edit when has value
            pickerButton.style.display = hasValue ? DisplayStyle.None : DisplayStyle.Flex;
            clearButton.style.display = hasValue ? DisplayStyle.Flex : DisplayStyle.None;
            editButton.style.display = hasValue ? DisplayStyle.Flex : DisplayStyle.None;
        }

        protected abstract void ShowPicker(Rect buttonRect, int currentValue, Action<int> onSelected);

        protected abstract string GetDisplayName(int id);

        protected abstract string GetEntityType();

        void UpdateNameLabel(Label label, int id)
        {
            if (id == 0)
            {
                label.text = "(None)";
                return;
            }

            string displayName = GetDisplayName(id);
            label.text = displayName ?? $"(Missing: {id})";
        }
    }
}
