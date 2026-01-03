namespace GameScript
{
    /// <summary>
    /// Read-only context provided to condition and action methods.
    /// Provides access to current node data from the FlatBuffers snapshot.
    /// </summary>
    public interface IDialogueContext
    {
        /// <summary>
        /// The current node's database ID.
        /// </summary>
        int NodeId { get; }

        /// <summary>
        /// The current conversation's database ID.
        /// </summary>
        int ConversationId { get; }

        /// <summary>
        /// The actor for the current node.
        /// </summary>
        ActorRef Actor { get; }

        /// <summary>
        /// The localized voice/dialogue text for the current node.
        /// </summary>
        string VoiceText { get; }

        /// <summary>
        /// The localized UI response text (for choice buttons) for the current node.
        /// </summary>
        string UIResponseText { get; }

        /// <summary>
        /// The number of custom properties attached to the current node.
        /// </summary>
        int PropertyCount { get; }

        /// <summary>
        /// Gets a custom property by index.
        /// </summary>
        NodePropertyRef GetProperty(int index);
    }
}
