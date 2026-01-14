using System;

namespace GameScript
{
    /// <summary>
    /// Represents a locale entry in the manifest.
    /// </summary>
    [Serializable]
    public sealed class ManifestLocale
    {
        public int id;
        public string name = string.Empty;
        public string localizedName = string.Empty;
        public string hash = string.Empty;

        // Properties for convenient access
        public int Id => id;
        public string Name => name;
        public string LocalizedName => localizedName;
        public string Hash => hash;
    }

    /// <summary>
    /// Represents the manifest.json file that accompanies snapshot exports.
    /// </summary>
    [Serializable]
    public sealed class Manifest
    {
        public string version = string.Empty;
        public ManifestLocale[] locales = Array.Empty<ManifestLocale>();
        public int primaryLocale;
        public string exportedAt = string.Empty;

        // Properties for convenient access
        public string Version => version;
        public ManifestLocale[] Locales => locales;
        public int PrimaryLocaleIndex => primaryLocale;
        public string ExportedAt => exportedAt;

        /// <summary>
        /// Gets the locale entry for the primary locale.
        /// </summary>
        public ManifestLocale GetPrimaryLocale()
        {
            if (locales == null || locales.Length == 0)
                return null;

            if (primaryLocale >= 0 && primaryLocale < locales.Length)
                return locales[primaryLocale];

            return locales[0];
        }
    }
}
