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
        #region State
        readonly GameScriptManifest _gsManifest;
        Snapshot _snapshot;
        int _currentLocaleIndex = -1;

        // ID-to-index maps for O(1) lookups (built on snapshot load)
        Dictionary<int, int> _conversationIdToIndex;
        Dictionary<int, int> _actorIdToIndex;
        Dictionary<int, int> _localizationIdToIndex;
        Dictionary<int, int> _nodeIdToIndex;
        Dictionary<int, int> _edgeIdToIndex;

#if UNITY_EDITOR
        string _loadedHash;
#endif
        #endregion

        #region Constructor
        GameScriptDatabase(GameScriptManifest manifest)
        {
            _gsManifest = manifest;
        }

        // Editor-only constructor for legacy EditorInstance pattern
#if UNITY_EDITOR
        GameScriptDatabase() { _gsManifest = null; }
#endif
        #endregion

        #region Factory
        /// <summary>
        /// Creates a new database instance for the specified locale.
        /// </summary>
        internal static async Awaitable<GameScriptDatabase> Create(GameScriptManifest manifest, LocaleRef locale, CancellationToken token)
        {
            GameScriptDatabase database = new(manifest);
            await database.LoadSnapshot(locale.Index, token);
            return database;
        }
        #endregion

        #region Public API
        /// <summary>
        /// Invoked after the locale has changed and the new snapshot is loaded.
        /// </summary>
        public event Action OnLocaleChanged;

        /// <summary>
        /// The manifest this database was created from.
        /// </summary>
        public GameScriptManifest Manifest => _gsManifest;

        /// <summary>
        /// The currently loaded locale.
        /// </summary>
        public LocaleRef CurrentLocale => new(_gsManifest.Manifest, _currentLocaleIndex);

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
        /// Finds a conversation by ID. O(1) lookup using ID-to-index map.
        /// </summary>
        public ConversationRef FindConversation(int id)
        {
            if (_conversationIdToIndex != null && _conversationIdToIndex.TryGetValue(id, out int index))
            {
                return GetConversation(index);
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
        /// Finds an actor by ID. O(1) lookup using ID-to-index map.
        /// </summary>
        public ActorRef FindActor(int id)
        {
            if (_actorIdToIndex != null && _actorIdToIndex.TryGetValue(id, out int index))
            {
                return GetActor(index);
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
        /// Finds a localization by ID. O(1) lookup using ID-to-index map.
        /// </summary>
        public LocalizationRef FindLocalization(int id)
        {
            if (_localizationIdToIndex != null && _localizationIdToIndex.TryGetValue(id, out int index))
            {
                return GetLocalization(index);
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
        /// Finds a node by ID. O(1) lookup using ID-to-index map.
        /// </summary>
        public NodeRef FindNode(int id)
        {
            if (_nodeIdToIndex != null && _nodeIdToIndex.TryGetValue(id, out int index))
            {
                return GetNode(index);
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
        /// Finds an edge by ID. O(1) lookup using ID-to-index map.
        /// </summary>
        public EdgeRef FindEdge(int id)
        {
            if (_edgeIdToIndex != null && _edgeIdToIndex.TryGetValue(id, out int index))
            {
                return GetEdge(index);
            }
            throw new KeyNotFoundException($"Edge with ID {id} not found");
        }

        // ===== Locales (delegated to Manifest) =====

        /// <summary>
        /// The number of locales in the manifest.
        /// </summary>
        public int LocaleCount => _gsManifest?.LocaleCount ?? 0;

        /// <summary>
        /// Gets a locale by index.
        /// </summary>
        public LocaleRef GetLocale(int index) => _gsManifest.GetLocale(index);

        /// <summary>
        /// Finds a locale from the manifest by ID.
        /// </summary>
        public LocaleRef FindLocale(LocaleId id) => _gsManifest.FindLocale(id);

        /// <summary>
        /// Finds a locale from the manifest by ID.
        /// </summary>
        public LocaleRef FindLocale(int id) => _gsManifest.FindLocale(id);
        #endregion

        #region Internal API
        /// <summary>
        /// The currently loaded snapshot. Internal to avoid exposing FlatSharp types.
        /// </summary>
        internal Snapshot Snapshot => _snapshot;
        #endregion

        #region Private API
        async Awaitable LoadSnapshot(int localeIndex, CancellationToken token)
        {
            string snapshotPath = _gsManifest.GetSnapshotPath(localeIndex);
            byte[] buffer = await GameScriptPaths.LoadBytesAsync(snapshotPath, token);
            SetSnapshot(localeIndex, buffer);
        }

        void SetSnapshot(int localeIndex, byte[] buffer)
        {
            _snapshot = Snapshot.Serializer.Parse(new ArrayInputBuffer(buffer));
            _currentLocaleIndex = localeIndex;
            BuildIdMaps();
#if UNITY_EDITOR
            _loadedHash = _gsManifest.Manifest.Locales[localeIndex].Hash;
#endif
        }

        void BuildIdMaps()
        {
            // Build conversation ID map
            int convCount = _snapshot?.Conversations?.Count ?? 0;
            _conversationIdToIndex = new Dictionary<int, int>(convCount);
            for (int i = 0; i < convCount; i++)
            {
                _conversationIdToIndex[_snapshot.Conversations[i].Id] = i;
            }

            // Build actor ID map
            int actorCount = _snapshot?.Actors?.Count ?? 0;
            _actorIdToIndex = new Dictionary<int, int>(actorCount);
            for (int i = 0; i < actorCount; i++)
            {
                _actorIdToIndex[_snapshot.Actors[i].Id] = i;
            }

            // Build localization ID map
            int locCount = _snapshot?.Localizations?.Count ?? 0;
            _localizationIdToIndex = new Dictionary<int, int>(locCount);
            for (int i = 0; i < locCount; i++)
            {
                _localizationIdToIndex[_snapshot.Localizations[i].Id] = i;
            }

            // Build node ID map
            int nodeCount = _snapshot?.Nodes?.Count ?? 0;
            _nodeIdToIndex = new Dictionary<int, int>(nodeCount);
            for (int i = 0; i < nodeCount; i++)
            {
                _nodeIdToIndex[_snapshot.Nodes[i].Id] = i;
            }

            // Build edge ID map
            int edgeCount = _snapshot?.Edges?.Count ?? 0;
            _edgeIdToIndex = new Dictionary<int, int>(edgeCount);
            for (int i = 0; i < edgeCount; i++)
            {
                _edgeIdToIndex[_snapshot.Edges[i].Id] = i;
            }
        }
        #endregion

        #region Editor
#if UNITY_EDITOR
        // Legacy editor support - maintains the EditorInstance pattern for property drawers
        // This uses a separate code path that doesn't require GameScriptManifest

        // Editor-only state for legacy pattern
        Manifest _editorManifest;
        string _manifestPath;
        string[] _snapshotPaths;

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
            string manifestPath = GameScriptPaths.BuildPath(basePath, GameScriptPaths.ManifestFilename);

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
            if (s_editorInstance._editorManifest == null)
            {
                s_editorInstance._manifestPath = manifestPath;
                s_editorInstance._editorManifest = LoadManifestSync(manifestPath);
                s_editorInstance.CacheEditorSnapshotPaths(basePath);

                // Load primary locale snapshot
                int primaryIndex = s_editorInstance._editorManifest.PrimaryLocaleIndex;
                if (s_editorInstance._editorManifest.Locales != null && s_editorInstance._editorManifest.Locales.Length > 0)
                {
                    if (primaryIndex < 0 || primaryIndex >= s_editorInstance._editorManifest.Locales.Length)
                        primaryIndex = 0;

                    if (File.Exists(s_editorInstance._snapshotPaths[primaryIndex]))
                    {
                        byte[] buffer = File.ReadAllBytes(s_editorInstance._snapshotPaths[primaryIndex]);
                        s_editorInstance.SetEditorSnapshot(primaryIndex, buffer);
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
            return s_editorInstance?._editorManifest;
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

        void CacheEditorSnapshotPaths(string basePath)
        {
            _snapshotPaths = GameScriptPaths.BuildSnapshotPaths(basePath, _editorManifest.Locales);
        }

        void SetEditorSnapshot(int localeIndex, byte[] buffer)
        {
            _snapshot = Snapshot.Serializer.Parse(new ArrayInputBuffer(buffer));
            _currentLocaleIndex = localeIndex;
            BuildIdMaps();
            _loadedHash = _editorManifest.Locales[localeIndex].Hash;
        }

        void CheckForHotReload(string basePath)
        {
            if (_editorManifest == null || _currentLocaleIndex < 0)
                return;

            if (!File.Exists(_manifestPath))
                return;

            Manifest freshManifest = LoadManifestSync(_manifestPath);

            // Find current locale by name in the fresh manifest
            string currentLocaleName = _editorManifest.Locales[_currentLocaleIndex].Name;
            int index = GetLocaleIndexByName(freshManifest.Locales, currentLocaleName);
            if (index < 0)
                return;

            ManifestLocale freshLocale = freshManifest.Locales[index];
            if (freshLocale.Hash == _loadedHash)
                return;

            // Snapshot has changed, reload synchronously
            // Also refresh path cache in case locale names changed
            _editorManifest = freshManifest;
            CacheEditorSnapshotPaths(basePath);
            byte[] buffer = File.ReadAllBytes(_snapshotPaths[index]);
            SetEditorSnapshot(index, buffer);
        }

        static Manifest LoadManifestSync(string fullPath)
        {
            string json = File.ReadAllText(fullPath);
            return JsonUtility.FromJson<Manifest>(json);
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
#endif
        #endregion
    }
}
