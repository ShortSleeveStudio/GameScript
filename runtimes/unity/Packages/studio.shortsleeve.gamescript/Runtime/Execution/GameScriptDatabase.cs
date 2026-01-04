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
        int _currentLocaleIndex = -1;
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
        /// The currently loaded locale.
        /// </summary>
        public LocaleRef CurrentLocale => new LocaleRef(_manifest, _currentLocaleIndex);

        /// <summary>
        /// Changes the current locale and reloads the snapshot.
        /// </summary>
        public async Awaitable ChangeLocale(LocaleRef locale, CancellationToken token = default)
        {
            await LoadSnapshot(locale.Index, token);
            OnLocaleChanged?.Invoke();
        }

        // ===== Conversations =====

        /// <summary>
        /// The number of conversations in the current snapshot.
        /// </summary>
        public int ConversationCount => _snapshot?.Conversations?.Count ?? 0;

        /// <summary>
        /// Gets a conversation by index.
        /// </summary>
        public ConversationRef GetConversation(int index)
        {
            return new ConversationRef(_snapshot, index);
        }

        /// <summary>
        /// Finds a conversation by ID.
        /// </summary>
        public ConversationRef FindConversation(ConversationId id) => FindConversation((int)id);

        /// <summary>
        /// Finds a conversation by ID.
        /// </summary>
        public ConversationRef FindConversation(int id)
        {
            int count = ConversationCount;
            for (int i = 0; i < count; i++)
            {
                if (_snapshot.Conversations[i].Id == id)
                    return GetConversation(i);
            }
            throw new KeyNotFoundException($"Conversation with ID {id} not found");
        }

        // ===== Actors =====

        /// <summary>
        /// The number of actors in the current snapshot.
        /// </summary>
        public int ActorCount => _snapshot?.Actors?.Count ?? 0;

        /// <summary>
        /// Gets an actor by index.
        /// </summary>
        public ActorRef GetActor(int index)
        {
            return new ActorRef(_snapshot, index);
        }

        /// <summary>
        /// Finds an actor by ID.
        /// </summary>
        public ActorRef FindActor(ActorId id) => FindActor((int)id);

        /// <summary>
        /// Finds an actor by ID.
        /// </summary>
        public ActorRef FindActor(int id)
        {
            int count = ActorCount;
            for (int i = 0; i < count; i++)
            {
                if (_snapshot.Actors[i].Id == id)
                    return GetActor(i);
            }
            throw new KeyNotFoundException($"Actor with ID {id} not found");
        }

        // ===== Localizations =====

        /// <summary>
        /// The number of localizations in the current snapshot.
        /// </summary>
        public int LocalizationCount => _snapshot?.Localizations?.Count ?? 0;

        /// <summary>
        /// Gets a localization by index.
        /// </summary>
        public LocalizationRef GetLocalization(int index)
        {
            return new LocalizationRef(_snapshot, index);
        }

        /// <summary>
        /// Finds a localization by ID.
        /// </summary>
        public LocalizationRef FindLocalization(LocalizationId id) => FindLocalization((int)id);

        /// <summary>
        /// Finds a localization by ID.
        /// </summary>
        public LocalizationRef FindLocalization(int id)
        {
            int count = LocalizationCount;
            for (int i = 0; i < count; i++)
            {
                if (_snapshot.Localizations[i].Id == id)
                    return GetLocalization(i);
            }
            throw new KeyNotFoundException($"Localization with ID {id} not found");
        }

        // ===== Nodes =====

        /// <summary>
        /// The number of nodes in the current snapshot.
        /// </summary>
        public int NodeCount => _snapshot?.Nodes?.Count ?? 0;

        /// <summary>
        /// Gets a node by index.
        /// </summary>
        public NodeRef GetNode(int index)
        {
            return new NodeRef(_snapshot, index);
        }

        /// <summary>
        /// Finds a node by ID.
        /// </summary>
        public NodeRef FindNode(NodeId id) => FindNode((int)id);

        /// <summary>
        /// Finds a node by ID.
        /// </summary>
        public NodeRef FindNode(int id)
        {
            int count = NodeCount;
            for (int i = 0; i < count; i++)
            {
                if (_snapshot.Nodes[i].Id == id)
                    return GetNode(i);
            }
            throw new KeyNotFoundException($"Node with ID {id} not found");
        }

        // ===== Edges =====

        /// <summary>
        /// The number of edges in the current snapshot.
        /// </summary>
        public int EdgeCount => _snapshot?.Edges?.Count ?? 0;

        /// <summary>
        /// Gets an edge by index.
        /// </summary>
        public EdgeRef GetEdge(int index)
        {
            return new EdgeRef(_snapshot, index);
        }

        /// <summary>
        /// Finds an edge by ID.
        /// </summary>
        public EdgeRef FindEdge(EdgeId id) => FindEdge((int)id);

        /// <summary>
        /// Finds an edge by ID.
        /// </summary>
        public EdgeRef FindEdge(int id)
        {
            int count = EdgeCount;
            for (int i = 0; i < count; i++)
            {
                if (_snapshot.Edges[i].Id == id)
                    return GetEdge(i);
            }
            throw new KeyNotFoundException($"Edge with ID {id} not found");
        }

        // ===== Locales (from Manifest, not Snapshot) =====

        /// <summary>
        /// The number of locales in the manifest.
        /// </summary>
        public int LocaleCount => _manifest?.Locales?.Length ?? 0;

        /// <summary>
        /// Gets a locale by index.
        /// </summary>
        public LocaleRef GetLocale(int index)
        {
            return new LocaleRef(_manifest, index);
        }

        /// <summary>
        /// Finds a locale from the manifest by ID.
        /// </summary>
        public LocaleRef FindLocale(LocaleId id) => FindLocale((int)id);

        /// <summary>
        /// Finds a locale from the manifest by ID.
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
        #endregion

        #region Internal API
        /// <summary>
        /// The currently loaded snapshot. Internal to avoid exposing FlatSharp types.
        /// </summary>
        internal Snapshot Snapshot => _snapshot;

        /// <summary>
        /// Initializes the database by loading the manifest and primary locale snapshot.
        /// </summary>
        internal async Awaitable Initialize(Settings settings, CancellationToken token)
        {
            await LoadManifestAndCachePaths(settings.GameDataPath, token);

            int primaryIndex = _manifest.PrimaryLocaleIndex;
            if (_manifest.Locales == null || _manifest.Locales.Length == 0)
                throw new InvalidOperationException("No locales defined in manifest");

            if (primaryIndex < 0 || primaryIndex >= _manifest.Locales.Length)
                primaryIndex = 0;

            await LoadSnapshot(primaryIndex, token);
        }

        /// <summary>
        /// Initializes with a specific locale instead of the primary.
        /// </summary>
        internal async Awaitable Initialize(Settings settings, LocaleRef locale, CancellationToken token)
        {
            await LoadManifestAndCachePaths(settings.GameDataPath, token);
            await LoadSnapshot(locale.Index, token);
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
            _currentLocaleIndex = localeIndex;
#if UNITY_EDITOR
            _loadedHash = _manifest.Locales[localeIndex].Hash;
#endif
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
        /// Editor-only: Gets a shared database instance for property drawers, pickers, and external tooling.
        /// Lazily loads the snapshot using settings. Only hot-reloads when not in play mode.
        /// Returns null if settings are not configured or snapshot files don't exist.
        /// </summary>
        public static GameScriptDatabase EditorInstance
        {
            get
            {
                // EnsureEditorInstance handles lazy loading, validation, and hot-reload
                EnsureEditorInstance();
                return s_editorInstance;
            }
        }

        /// <summary>
        /// Editor-only: Gets the raw snapshot for internal use.
        /// Internal to avoid exposing FlatSharp types.
        /// </summary>
        internal static Snapshot EditorGetSnapshot()
        {
            EnsureEditorInstance();
            return s_editorInstance?._snapshot;
        }

        static void EnsureEditorInstance()
        {
            Settings settings = Settings.GetSettings();
            if (settings == null || string.IsNullOrEmpty(settings.GameDataPath))
            {
                s_editorInstance = null;
                s_editorBasePath = null;
                return;
            }

            string basePath = settings.GameDataPath;
            string manifestPath = BuildPath(basePath, ManifestFilename);

            if (!File.Exists(manifestPath))
            {
                s_editorInstance = null;
                s_editorBasePath = null;
                return;
            }

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
                int primaryIndex = s_editorInstance._manifest.PrimaryLocaleIndex;
                if (s_editorInstance._manifest.Locales != null && s_editorInstance._manifest.Locales.Length > 0)
                {
                    if (primaryIndex < 0 || primaryIndex >= s_editorInstance._manifest.Locales.Length)
                        primaryIndex = 0;

                    if (File.Exists(s_editorInstance._snapshotPaths[primaryIndex]))
                    {
                        byte[] buffer = File.ReadAllBytes(s_editorInstance._snapshotPaths[primaryIndex]);
                        s_editorInstance.SetSnapshot(primaryIndex, buffer);
                    }
                }
            }

            // Only hot-reload when not in play mode (edit time only)
            if (!UnityEditor.EditorApplication.isPlaying)
            {
                s_editorInstance.CheckForHotReload(basePath);
            }
        }

        /// <summary>
        /// Editor-only: Gets the manifest for property drawers and pickers.
        /// </summary>
        public static Manifest EditorGetManifest()
        {
            EnsureEditorInstance();
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
            if (_manifest == null || _currentLocaleIndex < 0)
                return;

            if (!File.Exists(_manifestPath))
                return;

            Manifest freshManifest = LoadManifestSync(_manifestPath);

            // Find current locale by name in the fresh manifest
            string currentLocaleName = _manifest.Locales[_currentLocaleIndex].Name;
            int index = GetLocaleIndexByName(freshManifest.Locales, currentLocaleName);
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
