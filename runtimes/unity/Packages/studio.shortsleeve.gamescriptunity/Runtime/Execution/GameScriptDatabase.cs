using System;
using System.IO;
using System.Threading;
using FlatBuffers;
using UnityEngine;

namespace GameScript
{
    public class GameScriptDatabase
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
        string _loadedHash;

        // Cached paths (allocated once after manifest load)
        string _manifestPath;
        string[] _snapshotPaths; // Indexed same as Manifest.Locales
        #endregion

        #region Constructor
        internal GameScriptDatabase() { }
        #endregion

        #region Public API
        /// <summary>
        /// The currently loaded snapshot.
        /// In editor, automatically reloads if the manifest hash has changed.
        /// </summary>
        public Snapshot Snapshot
        {
            get
            {
#if UNITY_EDITOR
                CheckForHotReload();
#endif
                return _snapshot;
            }
        }

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

            // Pre-allocate and cache all snapshot paths
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

            _snapshot = Snapshot.GetRootAsSnapshot(new ByteBuffer(buffer));
            _currentLocale = _manifest.Locales[localeIndex];
            _loadedHash = _currentLocale.Hash;
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
        void CheckForHotReload()
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
            byte[] buffer = File.ReadAllBytes(_snapshotPaths[index]);
            _snapshot = Snapshot.GetRootAsSnapshot(new ByteBuffer(buffer));
            _loadedHash = freshLocale.Hash;
            _manifest = freshManifest;
            _currentLocale = freshLocale;
        }
#endif
        #endregion
    }
}
