using System;
using UnityEngine;

namespace GameScript
{
    /// <summary>
    /// Represents a locale entry in the manifest.
    /// </summary>
    [Serializable]
    public class ManifestLocale
    {
        [SerializeField] readonly int id;
        [SerializeField] readonly string name;
        [SerializeField] readonly string localizedName;
        [SerializeField] readonly string hash;

        public int Id => id;
        public string Name => name;
        public string LocalizedName => localizedName;
        public string Hash => hash;
    }

    /// <summary>
    /// Represents the manifest.json file that accompanies snapshot exports.
    /// </summary>
    [Serializable]
    public class Manifest
    {
        [SerializeField] string version;
        [SerializeField] ManifestLocale[] locales;
        [SerializeField] int primaryLocale;
        [SerializeField] string exportedAt;

        public string Version => version;
        public ManifestLocale[] Locales => locales;
        public int PrimaryLocale => primaryLocale;
        public string ExportedAt => exportedAt;

        /// <summary>
        /// Gets the locale entry for the primary locale.
        /// </summary>
        public ManifestLocale GetPrimaryLocale()
        {
            foreach (ManifestLocale locale in locales)
            {
                if (locale.Id == primaryLocale)
                    return locale;
            }
            return locales.Length > 0 ? locales[0] : null;
        }

    }
}
