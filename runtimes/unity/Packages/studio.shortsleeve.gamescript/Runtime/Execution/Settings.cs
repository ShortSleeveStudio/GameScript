using System.IO;
using UnityEngine;

namespace GameScript
{
    public class Settings : ScriptableObject
    {
        #region Constants
        const string AppName = "GameScript";
        const string SettingsAssetName = "GameScriptSettings";
        #endregion

        #region Runtime Settings
        public uint InitialConversationPool;
        public bool PreventSingleNodeChoices;
        #endregion

        #region Editor Settings
        public string GameDataPath; // Relative to StreamingAssets folder
        #endregion

        #region Path Helpers
#if UNITY_EDITOR
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
                settings.GameDataPath = AppName; // Default to relative path
                UnityEditor.EditorApplication.delayCall += () =>
                {
                    UnityEditor.AssetDatabase.CreateAsset(
                        settings,
                        $"Assets/{SettingsAssetName}.asset"
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
