using System.Collections.Generic;
using UnityEngine;

namespace GameScript
{
    /// <summary>
    /// Call OnReady to signal that the conversation runner can proceed.
    /// </summary>
    public readonly struct ReadyNotifier
    {
        readonly AwaitableCompletionSource _source;

        internal ReadyNotifier(AwaitableCompletionSource source)
        {
            _source = source;
        }

        /// <summary>
        /// Signals that the game is ready to proceed.
        /// </summary>
        public void OnReady()
        {
            _source.SetResult();
        }
    }

    /// <summary>
    /// Call OnDecisionMade to signal the player's choice and allow the conversation to proceed.
    /// </summary>
    public readonly struct DecisionNotifier
    {
        readonly AwaitableCompletionSource<int> _source;

        internal DecisionNotifier(AwaitableCompletionSource<int> source)
        {
            _source = source;
        }

        /// <summary>
        /// Signals which node the player chose.
        /// </summary>
        public void OnDecisionMade(NodeRef node)
        {
            _source.SetResult(node.Index);
        }
    }

    /// <summary>
    /// GameScript listeners react to changes in conversation runner state.
    /// </summary>
    public interface IGameScriptListener
    {
        /// <summary>
        /// Called before the conversation starts.
        /// Call readyNotifier.OnReady() when ready to proceed.
        /// </summary>
        void OnConversationEnter(ConversationRef conversation, ReadyNotifier readyNotifier);

        /// <summary>
        /// Called before a node's action is executed.
        /// Call readyNotifier.OnReady() when ready to proceed.
        /// </summary>
        void OnNodeEnter(NodeRef node, ReadyNotifier readyNotifier);

        /// <summary>
        /// Called when the player must choose between multiple nodes.
        /// Call decisionNotifier.OnDecisionMade(chosenNode) with the selected node.
        /// </summary>
        void OnNodeExit(IReadOnlyList<NodeRef> choices, DecisionNotifier decisionNotifier);

        /// <summary>
        /// Called before auto-advancing to the next node.
        /// Call readyNotifier.OnReady() when ready to proceed.
        /// </summary>
        void OnNodeExit(NodeRef currentNode, ReadyNotifier readyNotifier);

        /// <summary>
        /// Called when the conversation ends.
        /// Call readyNotifier.OnReady() when ready to proceed.
        /// </summary>
        void OnConversationExit(ConversationRef conversation, ReadyNotifier readyNotifier);

        /// <summary>
        /// Called after OnConversationExit's ReadyNotifier.OnReady() is processed,
        /// right before the RunnerContext is released back to the pool.
        /// Use this for final cleanup: notifying managers, releasing resources, etc.
        /// </summary>
        void OnCleanup(ConversationRef conversation);

        /// <summary>
        /// Called when an error occurs during conversation execution.
        /// </summary>
        void OnError(ConversationRef conversation, System.Exception e);
    }
}
