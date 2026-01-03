using System;
using GameScript.Editor;
using UnityEditor;
using UnityEngine;

namespace GameScript
{
    [CustomPropertyDrawer(typeof(LocaleId))]
    class LocaleIdDrawer : BaseIdDrawer
    {
        protected override void ShowPicker(Rect buttonRect, int currentValue, Action<int> onSelected)
        {
            LocalePickerWindow.Show<LocalePickerWindow>(buttonRect, currentValue, onSelected);
        }

        protected override string GetDisplayName(int id)
        {
            return GameScriptDatabase.EditorGetLocaleName(id);
        }

        protected override string GetEntityType() => EntityType.Locale;
    }
}
