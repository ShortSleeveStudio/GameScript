using System.IO;
using UnityEditor;
using UnityEditor.UIElements;
using UnityEngine;
using UnityEngine.UIElements;

namespace GameScript
{
    class GameScriptSettingsProvider : SettingsProvider
    {
        #region Constants
        const string SettingsPath = "Project/GameScript";
        const string SuccessIcon = "✓";
        const string WarningIcon = "⚠";
        static readonly Color SuccessColor = new Color(0.4f, 0.8f, 0.4f);
        static readonly Color WarningColor = new Color(1f, 0.8f, 0.2f);
        static readonly Color SubtleTextColor = new Color(0.7f, 0.7f, 0.7f);
        #endregion

        #region State
        SerializedObject _serializedSettings;
        #endregion

        #region Constructor
        GameScriptSettingsProvider(string path, SettingsScope scope)
            : base(path, scope) { }
        #endregion

        #region SettingsProvider
        public override void OnActivate(string searchContext, VisualElement rootElement)
        {
            Settings settings = Settings.GetSettings();
            if (settings == null)
                return;

            _serializedSettings = new SerializedObject(settings);

            VisualElement root = new VisualElement();
            root.style.paddingTop = 10;
            root.style.paddingLeft = 10;
            root.style.paddingRight = 10;

            root.Add(CreateHeader("GameScript Settings", 18));
            root.Add(CreateDataPathSection());
            root.Add(CreateRuntimeSection());

            rootElement.Add(root);
        }

        public override void OnDeactivate()
        {
            _serializedSettings = null;
        }
        #endregion

        #region UI Construction
        static Label CreateHeader(string text, int fontSize)
        {
            Label header = new Label(text);
            header.style.fontSize = fontSize;
            header.style.unityFontStyleAndWeight = FontStyle.Bold;
            header.style.marginBottom = fontSize == 18 ? 10 : 5;
            return header;
        }

        static Label CreateDescription(string text)
        {
            Label description = new Label(text);
            description.style.color = SubtleTextColor;
            description.style.marginBottom = 5;
            return description;
        }

        static VisualElement CreateSection()
        {
            VisualElement section = new VisualElement();
            section.style.marginBottom = 15;
            return section;
        }

        VisualElement CreateDataPathSection()
        {
            VisualElement section = CreateSection();
            section.Add(CreateHeader("Data Location", 14));
            section.Add(CreateDescription("Path to GameScript data folder, relative to StreamingAssets."));

            // Path field row
            VisualElement pathRow = new VisualElement();
            pathRow.style.flexDirection = FlexDirection.Row;
            pathRow.style.alignItems = Align.Center;

            SerializedProperty gameDataPathProp = _serializedSettings.FindProperty("GameDataPath");
            TextField pathField = new TextField("Game Data Path");
            pathField.style.flexGrow = 1;
            pathField.BindProperty(gameDataPathProp);
            pathRow.Add(pathField);

            Button browseButton = new Button(() => BrowseForFolder(pathField));
            browseButton.text = "Browse...";
            browseButton.style.marginLeft = 5;
            pathRow.Add(browseButton);

            section.Add(pathRow);
            section.Add(CreatePathStatusRow(pathField));

            return section;
        }

        VisualElement CreatePathStatusRow(TextField pathField)
        {
            VisualElement statusRow = new VisualElement();
            statusRow.style.flexDirection = FlexDirection.Row;
            statusRow.style.alignItems = Align.Center;
            statusRow.style.marginTop = 5;

            Label statusIcon = new Label();
            statusIcon.style.width = 16;
            statusIcon.style.marginRight = 5;

            Label statusLabel = new Label();
            statusLabel.style.color = SubtleTextColor;

            statusRow.Add(statusIcon);
            statusRow.Add(statusLabel);

            pathField.RegisterValueChangedCallback(evt => UpdatePathStatus(evt.newValue, statusIcon, statusLabel));
            UpdatePathStatus(pathField.value, statusIcon, statusLabel);

            return statusRow;
        }

        void UpdatePathStatus(string relativePath, Label statusIcon, Label statusLabel)
        {
            if (string.IsNullOrEmpty(relativePath))
            {
                SetStatusWarning(statusIcon, statusLabel, "Path not configured");
                return;
            }

            string fullPath = Path.Combine(Application.streamingAssetsPath, relativePath);
            string manifestPath = Path.Combine(fullPath, "manifest.json");

            if (File.Exists(manifestPath))
            {
                SetStatusSuccess(statusIcon, statusLabel, "manifest.json found");
            }
            else if (Directory.Exists(fullPath))
            {
                SetStatusWarning(statusIcon, statusLabel, "Directory exists, but manifest.json not found");
            }
            else
            {
                SetStatusWarning(statusIcon, statusLabel, "Directory does not exist yet");
            }
        }

        static void SetStatusSuccess(Label icon, Label label, string message)
        {
            icon.text = SuccessIcon;
            icon.style.color = SuccessColor;
            label.text = message;
        }

        static void SetStatusWarning(Label icon, Label label, string message)
        {
            icon.text = WarningIcon;
            icon.style.color = WarningColor;
            label.text = message;
        }

        VisualElement CreateRuntimeSection()
        {
            VisualElement section = CreateSection();
            section.Add(CreateHeader("Runtime", 14));

            SerializedProperty poolProp = _serializedSettings.FindProperty("InitialConversationPool");
            UnsignedIntegerField poolField = new UnsignedIntegerField("Initial Conversation Pool");
            poolField.BindProperty(poolProp);
            poolField.tooltip = "Number of RunnerContext instances to pre-allocate. Increase if running many simultaneous conversations.";
            section.Add(poolField);

            SerializedProperty preventSingleProp = _serializedSettings.FindProperty("PreventSingleNodeChoices");
            Toggle preventSingleToggle = new Toggle("Prevent Single Node Choices");
            preventSingleToggle.BindProperty(preventSingleProp);
            preventSingleToggle.tooltip = "When enabled, automatically advances if there's only one valid choice instead of showing a single-option choice UI.";
            section.Add(preventSingleToggle);

            return section;
        }

        void BrowseForFolder(TextField pathField)
        {
            string startPath = Directory.Exists(Application.streamingAssetsPath)
                ? Application.streamingAssetsPath
                : Application.dataPath;

            string selectedPath = EditorUtility.OpenFolderPanel("Select GameScript Data Folder", startPath, "");
            if (string.IsNullOrEmpty(selectedPath))
                return;

            string streamingAssetsPath = Application.streamingAssetsPath.Replace('\\', '/');
            selectedPath = selectedPath.Replace('\\', '/');

            if (!selectedPath.StartsWith(streamingAssetsPath))
            {
                EditorUtility.DisplayDialog(
                    "Invalid Path",
                    "The selected folder must be inside the StreamingAssets folder.\n\n" +
                    $"StreamingAssets: {streamingAssetsPath}",
                    "OK"
                );
                return;
            }

            string relativePath = selectedPath[streamingAssetsPath.Length..].TrimStart('/');
            pathField.value = relativePath;
            _serializedSettings.ApplyModifiedProperties();
        }
        #endregion

        #region Registration
        [SettingsProvider]
        public static SettingsProvider CreateSettingsProvider()
        {
            return new GameScriptSettingsProvider(SettingsPath, SettingsScope.Project)
            {
                keywords = new[] { "GameScript", "Dialogue", "Conversation", "Localization" }
            };
        }
        #endregion
    }
}
