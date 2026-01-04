using System.Threading;
using UnityEngine;

namespace GameScript
{
    /// <summary>
    /// MonoBehaviour wrapper for GameScriptRunner. Use this for Inspector-based setup.
    /// For programmatic setup, use GameScript.LoadManifest() and create a GameScriptRunner directly.
    /// </summary>
    public sealed class GameScriptBehaviour : MonoBehaviour
    {
        #region Inspector
        [Header("Settings")]
        [SerializeField]
        Settings _settings;

        [Header("Initialization")]
        [Tooltip("Automatically initialize on Awake using the primary locale")]
        [SerializeField]
        bool _initializeOnAwake = true;

        [Tooltip("Locale ID to load. If 0, uses the primary locale.")]
        [SerializeField]
        LocaleId _localeId;
        #endregion

        #region State
        GameScriptManifest _manifest;
        GameScriptRunner _runner;
        #endregion

        #region Public API
        /// <summary>
        /// The underlying runner. Null until initialized.
        /// </summary>
        public GameScriptRunner Runner => _runner;

        /// <summary>
        /// The database from the runner. Null until initialized.
        /// </summary>
        public GameScriptDatabase Database => _runner?.Database;

        /// <summary>
        /// The manifest. Null until initialized.
        /// </summary>
        public GameScriptManifest Manifest => _manifest;

        /// <summary>
        /// Whether the runner has been initialized.
        /// </summary>
        public bool IsInitialized => _runner != null;

        /// <summary>
        /// Initializes with the primary locale.
        /// </summary>
        public async Awaitable Initialize(CancellationToken token = default)
        {
            _manifest = await GameScriptLoader.LoadManifest(_settings, token);
            _runner = await _manifest.CreateRunner(_settings, token);
        }

        /// <summary>
        /// Initializes with a specific locale by ID.
        /// </summary>
        public async Awaitable Initialize(LocaleId localeId, CancellationToken token = default)
        {
            _manifest = await GameScriptLoader.LoadManifest(_settings, token);
            LocaleRef locale = localeId.IsValid
                ? _manifest.FindLocale(localeId)
                : _manifest.PrimaryLocale;
            _runner = await _manifest.CreateRunner(locale, _settings, token);
        }

        /// <summary>
        /// Initializes with a pre-loaded manifest and locale.
        /// </summary>
        public async Awaitable Initialize(GameScriptManifest manifest, LocaleRef locale, CancellationToken token = default)
        {
            _manifest = manifest;
            _runner = await manifest.CreateRunner(locale, _settings, token);
        }

        /// <summary>
        /// Initializes with a pre-loaded database.
        /// </summary>
        public void Initialize(GameScriptDatabase database)
        {
            _manifest = database.Manifest;
            _runner = new GameScriptRunner(database, _settings);
        }
        #endregion

        #region Unity Lifecycle
        async void Awake()
        {
            if (_initializeOnAwake)
            {
                if (_localeId.IsValid)
                    await Initialize(_localeId, destroyCancellationToken);
                else
                    await Initialize(destroyCancellationToken);
            }
        }

        void OnDestroy()
        {
            _runner?.StopAllConversations();
        }
        #endregion

        #region Editor
#if UNITY_EDITOR
        void OnValidate()
        {
            if (!_settings)
                _settings = Settings.GetSettings();
        }
#endif
        #endregion
    }
}
