using System;
using System.Collections.Generic;
using System.IO;
using System.Threading;
using FlatSharp;
using UnityEngine;

namespace GameScript
{
    public sealed class GameScriptDatabase
    {
        #region Constants
        const string ManifestFilename = "manifest.json";
        const string LocalesFolder = "locales";
        const string SnapshotExtension = ".gsb";
        #endregion

        #region State
        Manifest _manifest;
        Snapshot _snapshot;
        ManifestLocale _currentLocale;
#if UNITY_EDITOR
        string _loadedHash;
#endif

        // Cached paths (allocated once after manifest load)
        string _manifestPath;
        string[] _snapshotPaths; // Indexed same as Manifest.Locales
        #endregion

        #region Constructor
        internal GameScriptDatabase() { }
        #endregion

        #region Public API
        /// <summary>
        /// Invoked after the locale has changed and the new snapshot is loaded.
        /// </summary>
        public event Action OnLocaleChanged;

        /// <summary>
        /// The currently loaded snapshot.
        /// </summary>
        public Snapshot Snapshot => _snapshot;

        /// <summary>
        /// The manifest containing available locales and metadata.
        /// </summary>
        public Manifest Manifest => _manifest;

        /// <summary>
        /// The currently loaded locale.
        /// </summary>
        public ManifestLocale CurrentLocale => _currentLocale;

        /// <summary>
        /// Changes the current locale and reloads the snapshot.
        /// </summary>
        public async Awaitable ChangeLocale(ManifestLocale locale, CancellationToken token = default)
        {
            int index = GetLocaleIndex(locale);
            if (index < 0)
                throw new ArgumentException($"Locale '{locale.Name}' not found in manifest");

            await LoadSnapshot(index, token);
            OnLocaleChanged?.Invoke();
        }
        #endregion

        #region Internal API
        /// <summary>
        /// Initializes the database by loading the manifest and primary locale snapshot.
        /// </summary>
        internal async Awaitable Initialize(Settings settings, CancellationToken token)
        {
            await LoadManifestAndCachePaths(settings.GameDataPath, token);

            ManifestLocale primaryLocale = _manifest.GetPrimaryLocale();
            if (primaryLocale == null)
                throw new InvalidOperationException("No locales defined in manifest");

            int index = GetLocaleIndex(primaryLocale);
            await LoadSnapshot(index, token);
        }

        /// <summary>
        /// Initializes with a specific locale instead of the primary.
        /// </summary>
        internal async Awaitable Initialize(Settings settings, ManifestLocale locale, CancellationToken token)
        {
            await LoadManifestAndCachePaths(settings.GameDataPath, token);

            int index = GetLocaleIndex(locale);
            if (index < 0)
                throw new ArgumentException($"Locale '{locale.Name}' not found in manifest");

            await LoadSnapshot(index, token);
        }
        #endregion

        #region Private API
        async Awaitable LoadManifestAndCachePaths(string basePath, CancellationToken token)
        {
            // Build and cache manifest path
            _manifestPath = BuildPath(basePath, ManifestFilename);

            // Load manifest
            _manifest = await LoadManifestAsync(_manifestPath, token);

            // Cache snapshot paths
            CacheSnapshotPaths(basePath);
        }

        void CacheSnapshotPaths(string basePath)
        {
            _snapshotPaths = new string[_manifest.Locales.Length];
            for (int i = 0; i < _manifest.Locales.Length; i++)
            {
                string localeName = _manifest.Locales[i].Name;
                _snapshotPaths[i] = BuildPath(basePath, LocalesFolder, localeName + SnapshotExtension);
            }
        }

        async Awaitable LoadSnapshot(int localeIndex, CancellationToken token)
        {
            byte[] buffer = await LoadBytesAsync(_snapshotPaths[localeIndex], token);
            SetSnapshot(localeIndex, buffer);
        }

        void SetSnapshot(int localeIndex, byte[] buffer)
        {
            _snapshot = Snapshot.Serializer.Parse(new ArrayInputBuffer(buffer));
            _currentLocale = _manifest.Locales[localeIndex];
#if UNITY_EDITOR
            _loadedHash = _currentLocale.Hash;
#endif
        }

        int GetLocaleIndex(ManifestLocale locale)
        {
            ManifestLocale[] locales = _manifest.Locales;
            for (int i = 0; i < locales.Length; i++)
            {
                if (locales[i].Id == locale.Id)
                    return i;
            }
            return -1;
        }

        static int GetLocaleIndexByName(ManifestLocale[] locales, string name)
        {
            for (int i = 0; i < locales.Length; i++)
            {
                if (locales[i].Name == name)
                    return i;
            }
            return -1;
        }

        static string BuildPath(params string[] parts)
        {
            string relativePath = Path.Combine(parts);
            return Path.Combine(Application.streamingAssetsPath, relativePath);
        }

        async Awaitable<Manifest> LoadManifestAsync(string fullPath, CancellationToken token)
        {
            string json = await LoadTextAsync(fullPath, token);
            return JsonUtility.FromJson<Manifest>(json);
        }

        Manifest LoadManifestSync(string fullPath)
        {
            string json = File.ReadAllText(fullPath);
            return JsonUtility.FromJson<Manifest>(json);
        }

        static async Awaitable<string> LoadTextAsync(string fullPath, CancellationToken token)
        {
#if (UNITY_ANDROID || UNITY_WEBGL) && !UNITY_EDITOR
            return await LoadTextViaWebRequest(fullPath, token);
#else
            return await File.ReadAllTextAsync(fullPath, token);
#endif
        }

        static async Awaitable<byte[]> LoadBytesAsync(string fullPath, CancellationToken token)
        {
#if (UNITY_ANDROID || UNITY_WEBGL) && !UNITY_EDITOR
            return await LoadBytesViaWebRequest(fullPath, token);
#else
            return await File.ReadAllBytesAsync(fullPath, token);
#endif
        }

#if (UNITY_ANDROID || UNITY_WEBGL) && !UNITY_EDITOR
        async Awaitable<string> LoadTextViaWebRequest(string fullPath, CancellationToken token)
        {
            using (UnityEngine.Networking.UnityWebRequest www = CreateWebRequest(fullPath))
            {
                await SendWebRequest(www, token);
                return www.downloadHandler.text;
            }
        }

        async Awaitable<byte[]> LoadBytesViaWebRequest(string fullPath, CancellationToken token)
        {
            using (UnityEngine.Networking.UnityWebRequest www = CreateWebRequest(fullPath))
            {
                await SendWebRequest(www, token);
                return www.downloadHandler.data;
            }
        }

        static UnityEngine.Networking.UnityWebRequest CreateWebRequest(string fullPath)
        {
            // Convert file path to proper file:// URI, handling special characters
            Uri fileUri = new Uri(fullPath);
            return UnityEngine.Networking.UnityWebRequest.Get(fileUri.AbsoluteUri);
        }

        async Awaitable SendWebRequest(UnityEngine.Networking.UnityWebRequest www, CancellationToken token)
        {
            UnityEngine.Networking.UnityWebRequestAsyncOperation operation = www.SendWebRequest();

            while (!operation.isDone)
                await Awaitable.NextFrameAsync(token);

            if (www.result != UnityEngine.Networking.UnityWebRequest.Result.Success)
                throw new Exception($"Failed to load {www.url}: {www.error}");
        }
#endif

#if UNITY_EDITOR
        static GameScriptDatabase s_editorInstance;
        static string s_editorBasePath;

        /// <summary>
        /// Clears the static editor instance on domain reload.
        /// </summary>
        [UnityEditor.InitializeOnLoadMethod]
        static void ClearEditorInstance()
        {
            s_editorInstance = null;
            s_editorBasePath = null;
        }

        /// <summary>
        /// Editor-only: Gets a shared database instance for property drawers and pickers.
        /// Lazily loads the snapshot using settings. Only hot-reloads when not in play mode.
        /// </summary>
        public static Snapshot EditorGetSnapshot()
        {
            Settings settings = Settings.GetSettings();
            if (settings == null || string.IsNullOrEmpty(settings.GameDataPath))
                return null;

            string basePath = settings.GameDataPath;
            string manifestPath = BuildPath(basePath, ManifestFilename);

            if (!File.Exists(manifestPath))
                return null;

            // Check if settings path changed - invalidate cache
            if (s_editorInstance != null && s_editorBasePath != basePath)
            {
                s_editorInstance = null;
                s_editorBasePath = null;
            }

            if (s_editorInstance == null)
            {
                s_editorInstance = new GameScriptDatabase();
                s_editorBasePath = basePath;
            }

            // Load manifest and snapshot if not loaded
            if (s_editorInstance._manifest == null)
            {
                s_editorInstance._manifestPath = manifestPath;
                s_editorInstance._manifest = s_editorInstance.LoadManifestSync(manifestPath);
                s_editorInstance.CacheSnapshotPaths(basePath);

                // Load primary locale snapshot
                ManifestLocale primaryLocale = s_editorInstance._manifest.GetPrimaryLocale();
                if (primaryLocale != null)
                {
                    int index = s_editorInstance.GetLocaleIndex(primaryLocale);
                    if (index >= 0 && File.Exists(s_editorInstance._snapshotPaths[index]))
                    {
                        byte[] buffer = File.ReadAllBytes(s_editorInstance._snapshotPaths[index]);
                        s_editorInstance.SetSnapshot(index, buffer);
                    }
                }
            }

            // Only hot-reload when not in play mode (edit time only)
            if (!UnityEditor.EditorApplication.isPlaying)
            {
                s_editorInstance.CheckForHotReload(basePath);
            }

            return s_editorInstance._snapshot;
        }

        /// <summary>
        /// Editor-only: Gets the manifest for property drawers and pickers.
        /// Call EditorGetSnapshot() first to ensure the manifest is loaded.
        /// </summary>
        public static Manifest EditorGetManifest()
        {
            // Ensure snapshot (and manifest) is loaded
            EditorGetSnapshot();
            return s_editorInstance?._manifest;
        }

        /// <summary>
        /// Editor-only: Gets the display name for a conversation by ID.
        /// </summary>
        public static string EditorGetConversationName(int id)
        {
            Snapshot snapshot = EditorGetSnapshot();
            if (snapshot == null)
                return null;

            IList<Conversation> conversations = snapshot.Conversations;
            if (conversations == null)
                return null;

            int count = conversations.Count;
            for (int i = 0; i < count; i++)
            {
                Conversation conv = conversations[i];
                if (conv != null && conv.Id == id)
                    return conv.Name;
            }
            return null;
        }

        /// <summary>
        /// Editor-only: Gets the display name for an actor by ID.
        /// </summary>
        public static string EditorGetActorName(int id)
        {
            Snapshot snapshot = EditorGetSnapshot();
            if (snapshot == null)
                return null;

            IList<Actor> actors = snapshot.Actors;
            if (actors == null)
                return null;

            int count = actors.Count;
            for (int i = 0; i < count; i++)
            {
                Actor actor = actors[i];
                if (actor != null && actor.Id == id)
                    return actor.Name;
            }
            return null;
        }

        /// <summary>
        /// Editor-only: Gets the display name for a localization by ID.
        /// </summary>
        public static string EditorGetLocalizationName(int id)
        {
            Snapshot snapshot = EditorGetSnapshot();
            if (snapshot == null)
                return null;

            IList<Localization> localizations = snapshot.Localizations;
            if (localizations == null)
                return null;

            int count = localizations.Count;
            for (int i = 0; i < count; i++)
            {
                Localization loc = localizations[i];
                if (loc != null && loc.Id == id)
                    return loc.Name;
            }
            return null;
        }

        /// <summary>
        /// Editor-only: Gets the display name for a locale by ID.
        /// </summary>
        public static string EditorGetLocaleName(int id)
        {
            Manifest manifest = EditorGetManifest();
            if (manifest?.Locales == null)
                return null;

            for (int i = 0; i < manifest.Locales.Length; i++)
            {
                if (manifest.Locales[i].Id == id)
                    return manifest.Locales[i].Name;
            }
            return null;
        }

        void CheckForHotReload(string basePath)
        {
            if (_manifest == null || _currentLocale == null)
                return;

            if (!File.Exists(_manifestPath))
                return;

            Manifest freshManifest = LoadManifestSync(_manifestPath);

            int index = GetLocaleIndexByName(freshManifest.Locales, _currentLocale.Name);
            if (index < 0)
                return;

            ManifestLocale freshLocale = freshManifest.Locales[index];
            if (freshLocale.Hash == _loadedHash)
                return;

            // Snapshot has changed, reload synchronously
            // Also refresh path cache in case locale names changed
            _manifest = freshManifest;
            CacheSnapshotPaths(basePath);
            byte[] buffer = File.ReadAllBytes(_snapshotPaths[index]);
            SetSnapshot(index, buffer);
        }
#endif
        #endregion
    }
}
