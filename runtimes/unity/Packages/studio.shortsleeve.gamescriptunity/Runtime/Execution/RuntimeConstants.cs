using UnityEngine;

namespace GameScript
{
    public static class RuntimeConstants
    {
        public const string k_AppName = "GameScript";
        public const string k_Version = "0.0.0";
        public static readonly string k_ConversationDataFilename = $"{k_AppName}.dat";
        public static readonly string k_SettingsAssetName = $"{k_AppName}Settings";
        public static readonly string k_DefaultStreamingAssetsPath =
            Application.streamingAssetsPath + "/" + k_AppName;
    }
}
