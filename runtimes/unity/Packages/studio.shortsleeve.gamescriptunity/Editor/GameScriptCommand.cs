using System.IO;
using Unity.CodeEditor;
using UnityEngine;

namespace GameScript.Editor
{
    /// <summary>
    /// Writes command files for IPC with GameScript.
    /// </summary>
    public static class GameScriptCommand
    {
        /// <summary>
        /// Writes a navigate command to open an entity in GameScript.
        /// </summary>
        public static void Navigate(string entityType, int id)
        {
            Settings settings = Settings.GetSettings();
            string gameDataPath = settings.GetAbsoluteGameDataPath();

            if (string.IsNullOrEmpty(gameDataPath))
            {
                Debug.LogWarning("GameScript: Cannot open editor - GameDataPath is not configured.");
                return;
            }

            if (!Directory.Exists(gameDataPath))
            {
                Debug.LogWarning($"GameScript: Cannot open editor - directory does not exist: {gameDataPath}");
                return;
            }

            // Focus the code editor
            CodeEditor.CurrentEditor.OpenProject();

            Command command = new()
            {
                action = CommandAction.Navigate,
                type = entityType,
                id = id
            };

            string commandPath = Path.Combine(gameDataPath, Command.Filename);
            string json = JsonUtility.ToJson(command, false);
            File.WriteAllText(commandPath, json);
        }
    }
}
