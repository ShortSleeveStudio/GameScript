using UnityEditor;

namespace GameScript
{
    static class Menus
    {
        [MenuItem("GameScript/Settings...")]
        static void ShowSettings() => SettingsService.OpenProjectSettings("Project/GameScript");
    }
}
