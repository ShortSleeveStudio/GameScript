using System.Threading;

namespace GameScript
{
    /// <summary>
    /// Read-only context provided to condition and action methods.
    /// Provides access to current node data from the FlatBuffers snapshot.
    /// </summary>
    public interface IDialogueContext
    {
        /// <summary>
        /// Cancellation token for cooperative cancellation.
        /// Actions should check this token and exit early when cancelled.
        /// </summary>
        CancellationToken CancellationToken { get; }

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
        /// The runner-resolved voice/dialogue text for the current node.
        /// Gender, plural, and template substitution have already been applied by the runner
        /// using the parameters returned from
        /// <see cref="IGameScriptListener.OnSpeechParams(LocalizationRef, NodeRef)"/>.
        /// Returns <c>null</c> if this node has no voice text.
        /// </summary>
        string VoiceText { get; }

        /// <summary>
        /// The runner-resolved UI response text (for choice buttons) for the current node.
        /// Gender, plural, and template substitution have already been applied by the runner.
        /// Returns <c>null</c> if this node has no UI response text.
        /// </summary>
        string UIResponseText { get; }

        /// <summary>
        /// Index into <c>snapshot.Localizations</c> for the current node's voice text.
        /// Returns <c>-1</c> if this node has no voice text localization.
        /// </summary>
        int VoiceTextLocalizationIdx { get; }

        /// <summary>
        /// Index into <c>snapshot.Localizations</c> for the current node's UI response text.
        /// Returns <c>-1</c> if this node has no UI response text localization.
        /// </summary>
        int UIResponseTextLocalizationIdx { get; }

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
