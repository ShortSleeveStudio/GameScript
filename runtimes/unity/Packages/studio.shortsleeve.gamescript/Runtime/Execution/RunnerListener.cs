using System;
using System.Collections.Generic;
using System.Threading;
using UnityEngine;

namespace GameScript
{
    /// <summary>
    /// GameScript listeners react to changes in conversation runner state.
    /// All async methods should respect the CancellationToken for cooperative cancellation.
    /// </summary>
    public interface IGameScriptListener
    {
        /// <summary>
        /// Called before the conversation starts.
        /// Return when ready to proceed.
        /// </summary>
        Awaitable OnConversationEnter(ConversationRef conversation, CancellationToken token);

        /// <summary>
        /// Called when entering a node, before any action or speech.
        /// Return when ready to proceed.
        /// </summary>
        Awaitable OnNodeEnter(NodeRef node, CancellationToken token);

        /// <summary>
        /// Called before <see cref="OnSpeech"/> for nodes that have voice text.
        /// Return the <see cref="TextResolutionParams"/> the runner should use when resolving
        /// the variant and template for this node's voice text.
        /// </summary>
        /// <remarks>
        /// Default implementation: auto-resolve gender from the snapshot; use
        /// <see cref="PluralCategory.Other"/>; no template arguments.
        /// </remarks>
        /// <param name="localization">The voice-text localization entry for the node.</param>
        /// <param name="node">The node about to speak.</param>
        /// <returns>Resolution parameters for the voice text.</returns>
        virtual TextResolutionParams OnSpeechParams(LocalizationRef localization, NodeRef node)
            => default;

        /// <summary>
        /// Called when a dialogue node has speech to present.
        /// This runs concurrently with the node's action (if any).
        /// Return when the speech presentation is complete.
        /// </summary>
        /// <remarks>
        /// This is NOT called for logic nodes (nodes without speech text).
        /// The <paramref name="voiceText"/> has already been fully resolved by the runner:
        /// gender, plural category, and template substitution have all been applied using
        /// the parameters returned from <see cref="OnSpeechParams"/>.
        /// </remarks>
        /// <param name="node">The node that is speaking.</param>
        /// <param name="voiceText">The fully resolved voice/dialogue text for this node.</param>
        /// <param name="token">Cancellation token for cooperative cancellation.</param>
        Awaitable OnSpeech(NodeRef node, string voiceText, CancellationToken token);

        /// <summary>
        /// Called once per choice node before <see cref="OnDecision"/>.
        /// Return the <see cref="TextResolutionParams"/> the runner should use when resolving
        /// the UI response text for that choice.
        /// </summary>
        /// <remarks>
        /// Default implementation: auto-resolve gender from the snapshot; use
        /// <see cref="PluralCategory.Other"/>; no template arguments.
        /// </remarks>
        /// <param name="localization">The UI-response-text localization entry for the choice node.</param>
        /// <param name="choiceNode">The choice node whose UI response text is being resolved.</param>
        /// <returns>Resolution parameters for the choice's UI response text.</returns>
        virtual TextResolutionParams OnDecisionParams(LocalizationRef localization, NodeRef choiceNode)
            => default;

        /// <summary>
        /// Called when the player must choose between multiple nodes.
        /// Return the selected choice from the list.
        /// </summary>
        Awaitable<ChoiceRef> OnDecision(IReadOnlyList<ChoiceRef> choices, CancellationToken token);

        /// <summary>
        /// Called before leaving the current node.
        /// Use this for cleanup before advancing to the next node.
        /// Return when ready to proceed.
        /// </summary>
        Awaitable OnNodeExit(NodeRef currentNode, CancellationToken token);

        /// <summary>
        /// Called when the conversation ends.
        /// Return when ready to proceed.
        /// </summary>
        Awaitable OnConversationExit(ConversationRef conversation, CancellationToken token);

        /// <summary>
        /// Called when a conversation is forcibly stopped via StopConversation().
        /// Use this for cleanup: hiding dialogue UI, fading out animations, etc.
        /// Return when cleanup is complete.
        /// </summary>
        /// <remarks>
        /// No CancellationToken — cleanup must complete and cannot be cancelled.
        /// </remarks>
        Awaitable OnConversationCancelled(ConversationRef conversation);

        /// <summary>
        /// Called when an error occurs during conversation execution.
        /// Use this for error handling: showing error UI, logging, etc.
        /// Return when error handling is complete.
        /// </summary>
        /// <remarks>
        /// No CancellationToken — error handling must complete and cannot be cancelled.
        /// </remarks>
        Awaitable OnError(ConversationRef conversation, Exception e);

        /// <summary>
        /// Called in all paths (normal exit, cancellation, or error) before the RunnerContext
        /// is released back to the pool. Use this for final cleanup: notifying managers,
        /// releasing resources, resetting state, etc.
        /// Return when cleanup is complete.
        /// </summary>
        /// <remarks>
        /// No CancellationToken — cleanup must complete and cannot be cancelled.
        /// </remarks>
        Awaitable OnCleanup(ConversationRef conversation);

        /// <summary>
        /// Called when the conversation auto-advances without player input
        /// (e.g., when <see cref="Node.IsPreventResponse"/> is <c>true</c> or no UI response text
        /// is available). Return the choice to advance to from the highest-priority candidates.
        /// </summary>
        /// <remarks>
        /// Default implementation selects randomly among the candidates.
        /// Override to implement weighted selection, round-robin, or game-specific logic.
        /// </remarks>
        /// <param name="choices">
        /// Highest-priority target choices (all passed their conditions and share the same
        /// edge priority).
        /// </param>
        /// <returns>The choice to advance to.</returns>
        virtual ChoiceRef OnAutoDecision(IReadOnlyList<ChoiceRef> choices)
            => choices[UnityEngine.Random.Range(0, choices.Count)];
    }
}
