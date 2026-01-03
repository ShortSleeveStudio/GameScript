using System.Collections.Generic;
using System.Text;
using UnityEditor.Build;
using UnityEditor.Build.Reporting;
using UnityEngine;

namespace GameScript
{
    /// <summary>
    /// Validates that all nodes with HasCondition or HasAction have corresponding
    /// attributed methods before allowing a build to proceed.
    /// </summary>
    class GameScriptBuildProcessor : IPreprocessBuildWithReport
    {
        public int callbackOrder => 0;

        public void OnPreprocessBuild(BuildReport report)
        {
            Snapshot snapshot = GameScriptDatabase.EditorGetSnapshot();
            if (snapshot == null)
            {
                Debug.LogWarning("[GameScript] No snapshot found. Skipping build validation. Configure settings in Edit > Project Settings > GameScript.");
                return;
            }

            JumpTable jumpTable = JumpTableBuilder.Build(snapshot);
            List<string> errors = ValidateJumpTable(snapshot, jumpTable);

            if (errors.Count > 0)
            {
                StringBuilder sb = new StringBuilder();
                sb.AppendLine($"[GameScript] Build validation failed with {errors.Count} error(s):");
                sb.AppendLine();
                for (int i = 0; i < errors.Count; i++)
                {
                    sb.AppendLine($"  {i + 1}. {errors[i]}");
                }
                sb.AppendLine();
                sb.AppendLine("Add the missing methods or remove the condition/action flags from the nodes in GameScript.");

                throw new BuildFailedException(sb.ToString());
            }

            Debug.Log("[GameScript] Build validation passed.");
        }

        static List<string> ValidateJumpTable(Snapshot snapshot, JumpTable jumpTable)
        {
            List<string> errors = new List<string>();

            IList<Node> nodes = snapshot.Nodes;
            if (nodes == null)
                return errors;

            for (int i = 0; i < nodes.Count; i++)
            {
                Node node = nodes[i];
                if (node == null)
                    continue;

                int nodeId = node.Id;

                if (node.HasCondition && jumpTable.Conditions[i] == null)
                {
                    string conversationName = GetConversationName(snapshot, node.ConversationIdx);
                    errors.Add($"Node {nodeId} in \"{conversationName}\" has HasCondition=true but no [NodeCondition({nodeId})] method found.");
                }

                if (node.HasAction && jumpTable.Actions[i] == null)
                {
                    string conversationName = GetConversationName(snapshot, node.ConversationIdx);
                    errors.Add($"Node {nodeId} in \"{conversationName}\" has HasAction=true but no [NodeAction({nodeId})] method found.");
                }
            }

            return errors;
        }

        static string GetConversationName(Snapshot snapshot, int conversationIdx)
        {
            IList<Conversation> conversations = snapshot.Conversations;
            if (conversationIdx < 0 || conversations == null || conversationIdx >= conversations.Count)
                return "<unknown>";

            Conversation conv = conversations[conversationIdx];
            return conv != null ? (conv.Name ?? "<unnamed>") : "<unknown>";
        }
    }
}
