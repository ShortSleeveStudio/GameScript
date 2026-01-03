using System;
using GameScript.Editor;
using UnityEditor;
using UnityEngine;

namespace GameScript
{
    [CustomPropertyDrawer(typeof(ActorId))]
    class ActorIdDrawer : BaseIdDrawer
    {
        protected override void ShowPicker(Rect buttonRect, int currentValue, Action<int> onSelected)
        {
            ActorPickerWindow.Show<ActorPickerWindow>(buttonRect, currentValue, onSelected);
        }

        protected override string GetDisplayName(int id)
        {
            return GameScriptDatabase.EditorGetActorName(id);
        }
    }
}
