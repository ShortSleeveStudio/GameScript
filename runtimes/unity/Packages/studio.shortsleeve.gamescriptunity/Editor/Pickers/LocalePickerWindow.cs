namespace GameScript.Editor
{
    /// <summary>
    /// Picker window for selecting a locale.
    /// Simple search-based list (no tag filters).
    /// </summary>
    class LocalePickerWindow : BaseTwoLinePickerWindow
    {
        protected override string WindowTitle => "Select Locale";

        protected override void LoadItems()
        {
            allItems.Clear();

            Manifest manifest = GameScriptDatabase.EditorGetManifest();
            if (manifest?.Locales == null)
                return;

            int count = manifest.Locales.Length;
            for (int i = 0; i < count; i++)
            {
                ManifestLocale locale = manifest.Locales[i];
                allItems.Add(new PickerItem
                {
                    Id = locale.Id,
                    Name = locale.Name ?? $"(Locale {locale.Id})",
                    SubText = locale.LocalizedName ?? ""
                });
            }
        }
    }
}
