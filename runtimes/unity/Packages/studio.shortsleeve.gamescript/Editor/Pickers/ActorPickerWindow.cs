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

            IList<Localization> localizations = snapshot.Localizations;

            for (int i = 0; i < actors.Count; i++)
            {
                Actor actor = actors[i];
                if (actor == null) continue;

                // Resolve localized name through the variant system
                string localizedName = "";
                int nameIdx = actor.LocalizedNameIdx;
                if (nameIdx >= 0 && localizations != null && nameIdx < localizations.Count)
                {
                    Localization loc = localizations[nameIdx];
                    GenderCategory gender = NodeRef.ResolveStaticGender(loc, snapshot);
                    localizedName = VariantResolver.Resolve(loc, gender, PluralCategory.Other) ?? "";
                }

                allItems.Add(new PickerItem
                {
                    Id = actor.Id,
                    Name = actor.Name,
                    SubText = localizedName
                });
            }
        }
    }
}
