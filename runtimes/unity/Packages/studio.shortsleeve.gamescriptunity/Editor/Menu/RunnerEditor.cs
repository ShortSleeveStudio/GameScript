using UnityEditor;
using UnityEditor.UIElements;
using UnityEngine.UIElements;

namespace GameScript
{
    [CustomEditor(typeof(GameScriptRunner))]
    class RunnerEditor : UnityEditor.Editor
    {
        // TODO
        public override VisualElement CreateInspectorGUI()
        {
            // Create custom inspector
            VisualElement root = new VisualElement();

            // Add Default Inspector
            InspectorElement.FillDefaultInspector(root, serializedObject, this);
            return root;
        }
    }
}
