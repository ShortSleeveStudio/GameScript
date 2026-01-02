using System.IO;
using UnityEngine;

namespace GameScript
{
    public class Settings : ScriptableObject
    {
        #region Runtime Settings
        public uint InitialConversationPool;
        public bool PreventSingleNodeChoices;
        #endregion

        #region Editor Settings
        // All paths stored as relative for portability
        public string DatabasePath; // Relative to project root
        public string DatabaseVersion;
        public string GeneratedPath; // Relative to Assets folder
        public string GameDataPath; // Relative to StreamingAssets folder (used at runtime)
        #endregion

        #region Path Helpers
#if UNITY_EDITOR
        /// <summary>
        /// Gets the absolute path to the database file
        /// </summary>
        public string GetAbsoluteDatabasePath()
        {
            if (string.IsNullOrEmpty(DatabasePath))
                return string.Empty;

            string projectRoot = Path.GetFullPath(Path.Combine(Application.dataPath, ".."));
            return Path.GetFullPath(Path.Combine(projectRoot, DatabasePath)).Replace('\\', '/');
        }

        /// <summary>
        /// Gets the absolute path to the generated code folder
        /// </summary>
        public string GetAbsoluteGeneratedPath()
        {
            if (string.IsNullOrEmpty(GeneratedPath))
                return string.Empty;

            return Path.GetFullPath(Path.Combine(Application.dataPath, GeneratedPath)).Replace('\\', '/');
        }

        /// <summary>
        /// Gets the absolute path to the game data folder
        /// </summary>
        public string GetAbsoluteGameDataPath()
        {
            if (string.IsNullOrEmpty(GameDataPath))
                return string.Empty;

            return Path.GetFullPath(Path.Combine(Application.streamingAssetsPath, GameDataPath)).Replace('\\', '/');
        }
#endif
        #endregion

        #region Editor
#if UNITY_EDITOR
        public static Settings GetSettings()
        {
            string[] guids = UnityEditor.AssetDatabase.FindAssets("t:GameScript.Settings", null);
            Settings settings;
            // Delete extras
            if (guids.Length > 1)
            {
                for (int i = 1; i < guids.Length; i++)
                {
                    string pathToDelete = UnityEditor.AssetDatabase.GUIDToAssetPath(guids[i]);
                    Debug.LogWarning($"Deleting extra GameScript settings object: {pathToDelete}");
                    UnityEditor.AssetDatabase.DeleteAsset(pathToDelete);
                }
            }

            // At least one valid settings object
            if (guids.Length > 0)
            {
                string path = UnityEditor.AssetDatabase.GUIDToAssetPath(guids[0]);
                settings = UnityEditor.AssetDatabase.LoadAssetAtPath<Settings>(path);
            }
            // Create if non-existant
            else
            {
                settings = CreateInstance<Settings>();
                settings.InitialConversationPool = 1;
                settings.GameDataPath = RuntimeConstants.k_AppName; // Default to relative path
                // This is called in OnValidate
                UnityEditor.EditorApplication.delayCall += () =>
                {
                    UnityEditor.AssetDatabase.CreateAsset(
                        settings,
                        $"Assets/{RuntimeConstants.k_SettingsAssetName}.asset"
                    );
                    UnityEditor.AssetDatabase.SaveAssets();
                };
            }

            return settings;
        }
#endif
        #endregion
    }
}
