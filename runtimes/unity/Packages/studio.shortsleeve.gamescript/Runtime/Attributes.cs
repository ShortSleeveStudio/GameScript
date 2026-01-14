using System;

namespace GameScript
{
    /// <summary>
    /// Marks a method as a condition for a specific node.
    /// The method must be static and return bool.
    /// </summary>
    [AttributeUsage(AttributeTargets.Method, AllowMultiple = false)]
    public sealed class NodeConditionAttribute : Attribute
    {
        public int NodeId { get; }

        public NodeConditionAttribute(int nodeId)
        {
            NodeId = nodeId;
        }
    }

    /// <summary>
    /// Marks a method as an action for a specific node.
    /// The method must be static and return an awaitable type.
    /// </summary>
    [AttributeUsage(AttributeTargets.Method, AllowMultiple = false)]
    public sealed class NodeActionAttribute : Attribute
    {
        public int NodeId { get; }

        public NodeActionAttribute(int nodeId)
        {
            NodeId = nodeId;
        }
    }
}
