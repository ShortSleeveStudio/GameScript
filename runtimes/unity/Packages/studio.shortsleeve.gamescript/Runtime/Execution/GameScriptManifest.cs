using System;
using System.Collections.Generic;
using System.IO;
using System.Threading;
using UnityEngine;

namespace GameScript
{
    /// <summary>
    /// Shared constants and utilities for GameScript file loading.
    /// </summary>
    internal static class GameScriptPaths
    {
        internal const string ManifestFilename = "manifest.json";
        internal const string LocalesFolder = "locales";
        internal const string SnapshotExtension = ".gsb";

        internal static string BuildPath(params string[] parts)
        {
            string relativePath = Path.Combine(parts);
            return Path.Combine(Application.streamingAssetsPath, relativePath);
        }

        internal static string BuildSnapshotPath(string basePath, string localeName)
        {
            return BuildPath(basePath, LocalesFolder, localeName + SnapshotExtension);
        }

        internal static string[] BuildSnapshotPaths(string basePath, ManifestLocale[] locales)
        {
            string[] paths = new string[locales.Length];
            for (int i = 0; i < locales.Length; i++)
            {
                paths[i] = BuildSnapshotPath(basePath, locales[i].Name);
            }
            return paths;
        }

        internal static async Awaitable<string> LoadTextAsync(string fullPath, CancellationToken token)
        {
#if (UNITY_ANDROID || UNITY_WEBGL) && !UNITY_EDITOR
            return await LoadViaWebRequest(fullPath, token, www => www.downloadHandler.text);
#else
            return await File.ReadAllTextAsync(fullPath, token);
#endif
        }

        internal static async Awaitable<byte[]> LoadBytesAsync(string fullPath, CancellationToken token)
        {
#if (UNITY_ANDROID || UNITY_WEBGL) && !UNITY_EDITOR
            return await LoadViaWebRequest(fullPath, token, www => www.downloadHandler.data);
#else
            return await File.ReadAllBytesAsync(fullPath, token);
#endif
        }

#if (UNITY_ANDROID || UNITY_WEBGL) && !UNITY_EDITOR
        static async Awaitable<T> LoadViaWebRequest<T>(string fullPath, CancellationToken token, Func<UnityEngine.Networking.UnityWebRequest, T> extractor)
        {
            Uri fileUri = new Uri(fullPath);
            using (UnityEngine.Networking.UnityWebRequest www = UnityEngine.Networking.UnityWebRequest.Get(fileUri.AbsoluteUri))
            {
                UnityEngine.Networking.UnityWebRequestAsyncOperation operation = www.SendWebRequest();

                while (!operation.isDone)
                    await Awaitable.NextFrameAsync(token);

                if (www.result != UnityEngine.Networking.UnityWebRequest.Result.Success)
                    throw new Exception($"Failed to load {www.url}: {www.error}");

                return extractor(www);
            }
        }
#endif
    }

    /// <summary>
    /// Handle to the GameScript manifest. Use this to query available locales
    /// and create databases/runners. Obtained via GameScript.LoadManifest().
    /// </summary>
    public sealed class GameScriptManifest
    {

        #region State
        readonly Manifest _manifest;
        readonly string _basePath;
        readonly string[] _snapshotPaths;
        #endregion

        #region Constructor
        internal GameScriptManifest(Manifest manifest, string basePath)
        {
            _manifest = manifest;
            _basePath = basePath;
            _snapshotPaths = GameScriptPaths.BuildSnapshotPaths(basePath, manifest.Locales);
        }
        #endregion

        #region Public API
        /// <summary>
        /// The version string from the manifest.
        /// </summary>
        public string Version => _manifest.Version;

        /// <summary>
        /// The export timestamp from the manifest.
        /// </summary>
        public string ExportedAt => _manifest.ExportedAt;

        /// <summary>
        /// The number of locales available.
        /// </summary>
        public int LocaleCount => _manifest.Locales?.Length ?? 0;

        /// <summary>
        /// Gets a locale by index.
        /// </summary>
        public LocaleRef GetLocale(int index)
        {
            return new LocaleRef(_manifest, index);
        }

        /// <summary>
        /// The primary (default) locale.
        /// </summary>
        public LocaleRef PrimaryLocale
        {
            get
            {
                int index = _manifest.PrimaryLocaleIndex;
                if (index < 0 || index >= LocaleCount)
                    index = 0;
                return new LocaleRef(_manifest, index);
            }
        }

        /// <summary>
        /// Finds a locale by ID. Throws if not found.
        /// </summary>
        public LocaleRef FindLocale(LocaleId id) => FindLocale((int)id);

        /// <summary>
        /// Finds a locale by ID. Throws if not found.
        /// </summary>
        public LocaleRef FindLocale(int id)
        {
            int count = LocaleCount;
            for (int i = 0; i < count; i++)
            {
                if (_manifest.Locales[i].Id == id)
                    return GetLocale(i);
            }
            throw new KeyNotFoundException($"Locale with ID {id} not found");
        }

        /// <summary>
        /// Tries to find a locale by ID.
        /// </summary>
        public bool TryFindLocale(LocaleId id, out LocaleRef locale) => TryFindLocale((int)id, out locale);

        /// <summary>
        /// Tries to find a locale by ID.
        /// </summary>
        public bool TryFindLocale(int id, out LocaleRef locale)
        {
            int count = LocaleCount;
            for (int i = 0; i < count; i++)
            {
                if (_manifest.Locales[i].Id == id)
                {
                    locale = GetLocale(i);
                    return true;
                }
            }
            locale = default;
            return false;
        }

        /// <summary>
        /// Finds a locale by name/code (e.g., "en-US"). Throws if not found.
        /// </summary>
        public LocaleRef FindLocaleByName(string name)
        {
            int count = LocaleCount;
            for (int i = 0; i < count; i++)
            {
                if (_manifest.Locales[i].Name == name)
                    return GetLocale(i);
            }
            throw new KeyNotFoundException($"Locale with name '{name}' not found");
        }

        /// <summary>
        /// Tries to find a locale by name/code (e.g., "en-US").
        /// </summary>
        public bool TryFindLocaleByName(string name, out LocaleRef locale)
        {
            int count = LocaleCount;
            for (int i = 0; i < count; i++)
            {
                if (_manifest.Locales[i].Name == name)
                {
                    locale = GetLocale(i);
                    return true;
                }
            }
            locale = default;
            return false;
        }

        /// <summary>
        /// Loads a database for the specified locale.
        /// </summary>
        public async Awaitable<GameScriptDatabase> LoadDatabase(LocaleRef locale, CancellationToken token = default)
        {
            return await GameScriptDatabase.Create(this, locale, token);
        }

        /// <summary>
        /// Loads a database for the primary locale.
        /// </summary>
        public async Awaitable<GameScriptDatabase> LoadDatabase(CancellationToken token = default)
        {
            return await LoadDatabase(PrimaryLocale, token);
        }

        /// <summary>
        /// Creates a runner with a database for the specified locale.
        /// Convenience method combining LoadDatabase + new GameScriptRunner.
        /// </summary>
        public async Awaitable<GameScriptRunner> CreateRunner(LocaleRef locale, Settings settings, CancellationToken token = default)
        {
            GameScriptDatabase database = await LoadDatabase(locale, token);
            return new GameScriptRunner(database, settings);
        }

        /// <summary>
        /// Creates a runner with a database for the primary locale.
        /// Convenience method combining LoadDatabase + new GameScriptRunner.
        /// </summary>
        public async Awaitable<GameScriptRunner> CreateRunner(Settings settings, CancellationToken token = default)
        {
            return await CreateRunner(PrimaryLocale, settings, token);
        }
        #endregion

        #region Internal API
        internal Manifest Manifest => _manifest;
        internal string BasePath => _basePath;

        internal string GetSnapshotPath(int localeIndex)
        {
            return _snapshotPaths[localeIndex];
        }
        #endregion
    }
}
