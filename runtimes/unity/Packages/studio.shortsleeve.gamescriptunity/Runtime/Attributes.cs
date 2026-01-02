using System;

namespace GameScript
{
    /// <summary>
    /// Marks a method as a condition for a specific node.
    /// The method must have signature: static bool Method(IDialogueContext ctx)
    /// </summary>
    [AttributeUsage(AttributeTargets.Method, AllowMultiple = false)]
    public sealed class NodeConditionAttribute : Attribute
    {
        public int NodeId { get; }
        public int ConversationId { get; }

        public NodeConditionAttribute(int nodeId, int conversationId)
        {
            NodeId = nodeId;
            ConversationId = conversationId;
        }
    }

    /// <summary>
    /// Marks a method as an action for a specific node.
    /// The method must have signature: static async Awaitable Method(IDialogueContext ctx)
    /// </summary>
    [AttributeUsage(AttributeTargets.Method, AllowMultiple = false)]
    public sealed class NodeActionAttribute : Attribute
    {
        public int NodeId { get; }
        public int ConversationId { get; }

        public NodeActionAttribute(int nodeId, int conversationId)
        {
            NodeId = nodeId;
            ConversationId = conversationId;
        }
    }
}
