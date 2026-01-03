using System;
using GameScript.Editor;
using UnityEditor;
using UnityEngine;

namespace GameScript
{
    [CustomPropertyDrawer(typeof(LocalizationId))]
    class LocalizationIdDrawer : BaseIdDrawer
    {
        protected override void ShowPicker(Rect buttonRect, int currentValue, Action<int> onSelected)
        {
            LocalizationPickerWindow.Show<LocalizationPickerWindow>(buttonRect, currentValue, onSelected);
        }

        protected override string GetDisplayName(int id)
        {
            return GameScriptDatabase.EditorGetLocalizationName(id);
        }

        protected override string GetEntityType() => EntityType.Localization;
    }
}
