using System.Collections.Generic;

namespace GameScript.Editor
{
    /// <summary>
    /// Picker window for selecting an actor.
    /// Simple search-based list (no tag filters).
    /// </summary>
    class ActorPickerWindow : BaseTwoLinePickerWindow
    {
        protected override string WindowTitle => "Select Actor";

        protected override void LoadItems()
        {
            allItems.Clear();

            Snapshot snapshot = GameScriptDatabase.EditorGetSnapshot();
            if (snapshot == null)
                return;

            IList<Actor> actors = snapshot.Actors;
            if (actors == null)
                return;

            for (int i = 0; i < actors.Count; i++)
            {
                Actor actor = actors[i];
                if (actor == null) continue;

                allItems.Add(new PickerItem
                {
                    Id = actor.Id,
                    Name = actor.Name,
                    SubText = actor.LocalizedName ?? ""
                });
            }
        }
    }
}
