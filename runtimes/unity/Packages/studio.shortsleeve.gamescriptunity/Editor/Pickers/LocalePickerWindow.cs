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

            foreach (ManifestLocale locale in manifest.Locales)
            {
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
