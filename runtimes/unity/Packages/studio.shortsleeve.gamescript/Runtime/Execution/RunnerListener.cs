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
        /// Called when a dialogue node has speech to present.
        /// This runs concurrently with the node's action (if any).
        /// Return when the speech presentation is complete.
        ///
        /// Note: This is NOT called for logic nodes (nodes without speech text).
        /// </summary>
        Awaitable OnSpeech(NodeRef node, CancellationToken token);

        /// <summary>
        /// Called when the player must choose between multiple nodes.
        /// Return the selected node from the choices list.
        /// </summary>
        Awaitable<NodeRef> OnDecision(IReadOnlyList<NodeRef> choices, CancellationToken token);

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
        /// Note: No CancellationToken - cleanup must complete and cannot be cancelled.
        /// </summary>
        Awaitable OnConversationCancelled(ConversationRef conversation);

        /// <summary>
        /// Called when an error occurs during conversation execution.
        /// Use this for error handling: showing error UI, logging, etc.
        /// Return when error handling is complete.
        /// Note: No CancellationToken - error handling must complete and cannot be cancelled.
        /// </summary>
        Awaitable OnError(ConversationRef conversation, Exception e);

        /// <summary>
        /// Called in all paths (normal exit, cancellation, or error) before the RunnerContext
        /// is released back to the pool. Use this for final cleanup: notifying managers,
        /// releasing resources, resetting state, etc.
        /// Return when cleanup is complete.
        /// Note: No CancellationToken - cleanup must complete and cannot be cancelled.
        /// </summary>
        Awaitable OnCleanup(ConversationRef conversation);

        /// <summary>
        /// Called when the conversation auto-advances without player input
        /// (e.g., when IsPreventResponse is true or no UI response text).
        /// Return the node to advance to from the list of highest-priority choices.
        ///
        /// Default implementation selects randomly among the choices.
        /// Override to implement weighted selection, round-robin, or game-specific logic.
        /// </summary>
        /// <param name="choices">Highest-priority target nodes (all passed their conditions and share the same priority)</param>
        /// <returns>The node to advance to</returns>
        NodeRef OnAutoDecision(IReadOnlyList<NodeRef> choices)
            => choices[UnityEngine.Random.Range(0, choices.Count)];
    }
}
