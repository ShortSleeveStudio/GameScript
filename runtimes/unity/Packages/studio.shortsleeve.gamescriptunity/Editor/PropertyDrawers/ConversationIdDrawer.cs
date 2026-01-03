using System;
using GameScript.Editor;
using UnityEditor;
using UnityEngine;

namespace GameScript
{
    [CustomPropertyDrawer(typeof(ConversationId))]
    class ConversationIdDrawer : BaseIdDrawer
    {
        protected override void ShowPicker(Rect buttonRect, int currentValue, Action<int> onSelected)
        {
            ConversationPickerWindow.Show<ConversationPickerWindow>(buttonRect, currentValue, onSelected);
        }

        protected override string GetDisplayName(int id)
        {
            return GameScriptDatabase.EditorGetConversationName(id);
        }
    }
}
