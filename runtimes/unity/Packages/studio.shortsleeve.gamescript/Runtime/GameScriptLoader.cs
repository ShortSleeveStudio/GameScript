using System;
using System.Threading;
using UnityEngine;

namespace GameScript
{
    /// <summary>
    /// Static entry point for the GameScript dialogue system.
    /// Use LoadManifest() to begin initialization.
    /// </summary>
    public static class GameScriptLoader
    {
        /// <summary>
        /// Loads the manifest using the default settings asset.
        /// </summary>
        public static async Awaitable<GameScriptManifest> LoadManifest(CancellationToken token = default)
        {
            Settings settings = LoadDefaultSettings();
            return await LoadManifest(settings, token);
        }

        /// <summary>
        /// Loads the manifest using specific settings.
        /// </summary>
        public static async Awaitable<GameScriptManifest> LoadManifest(Settings settings, CancellationToken token = default)
        {
            if (settings == null)
                throw new ArgumentNullException(nameof(settings));
            if (string.IsNullOrEmpty(settings.GameDataPath))
                throw new InvalidOperationException("GameDataPath is not configured in Settings");

            return await LoadManifest(settings.GameDataPath, token);
        }

        /// <summary>
        /// Loads the manifest from a specific path (relative to StreamingAssets).
        /// </summary>
        public static async Awaitable<GameScriptManifest> LoadManifest(string basePath, CancellationToken token = default)
        {
            if (string.IsNullOrEmpty(basePath))
                throw new ArgumentNullException(nameof(basePath));

            string manifestPath = GameScriptPaths.BuildPath(basePath, GameScriptPaths.ManifestFilename);
            string json = await GameScriptPaths.LoadTextAsync(manifestPath, token);
            Manifest manifest = JsonUtility.FromJson<Manifest>(json);

            if (manifest.Locales == null || manifest.Locales.Length == 0)
                throw new InvalidOperationException("No locales defined in manifest");

            return new GameScriptManifest(manifest, basePath);
        }

        #region Private Helpers
        static Settings LoadDefaultSettings()
        {
#if UNITY_EDITOR
            return Settings.GetSettings();
#else
            // At runtime, settings must be loaded from Resources or passed explicitly
            Settings settings = Resources.Load<Settings>("GameScriptSettings");
            if (settings == null)
                throw new InvalidOperationException(
                    "GameScriptSettings not found in Resources. Either place the settings asset in a Resources folder " +
                    "or use GameScript.LoadManifest(settings) with an explicit settings reference.");
            return settings;
#endif
        }
        #endregion
    }
}
