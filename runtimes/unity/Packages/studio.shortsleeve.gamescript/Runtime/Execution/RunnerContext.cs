using System;
using System.Collections.Generic;
using System.Threading;
using UnityEngine;

namespace GameScript
{
    public sealed class RunnerContext : IDialogueContext
    {
        #region Constants
        const int DefaultChoiceCapacity = 8;
        #endregion

        #region Static
        static uint s_NextContextId = 1;
        static uint s_NextSequenceNumber = 1;
        #endregion

        #region Identity
        public uint ContextId { get; }
        public uint SequenceNumber { get; private set; }
        #endregion

        #region State
        GameScriptDatabase _database;
        JumpTable _jumpTable;
        IGameScriptListener _listener;
        Settings _settings;

        int _conversationIndex;
        int _nodeIndex;

        // Access snapshot through database to support live locale switching
        Snapshot Snapshot => _database.Snapshot;

        AwaitableCompletionSource _readySource;
        AwaitableCompletionSource _speechSource;
        AwaitableCompletionSource<int> _decisionSource;
        WhenAllAwaiter _whenAllAwaiter;

        // Reusable lists for collecting choices without allocation
        readonly List<NodeRef> _choices;
        readonly List<NodeRef> _highestPriorityChoices;

        // Cancellation support
        CancellationTokenSource _cts;
        #endregion

        #region Cancellation
        public CancellationToken CancellationToken => _cts.Token;

        internal void Cancel()
        {
            _cts.Cancel();

            // Unblock any pending awaits
            _readySource.TrySetCanceled();
            _speechSource.TrySetCanceled();
            _decisionSource.TrySetCanceled();
        }
        #endregion

        #region Constructor
        internal RunnerContext(Settings settings)
        {
            ContextId = s_NextContextId++;
            _settings = settings;
            _cts = new CancellationTokenSource();
            _readySource = new AwaitableCompletionSource();
            _speechSource = new AwaitableCompletionSource();
            _decisionSource = new AwaitableCompletionSource<int>();
            _whenAllAwaiter = new WhenAllAwaiter();
            _choices = new List<NodeRef>(DefaultChoiceCapacity);
            _highestPriorityChoices = new List<NodeRef>(DefaultChoiceCapacity);
        }
        #endregion

        #region IDialogueContext Implementation
        public int NodeId => Snapshot.Nodes[_nodeIndex].Id;

        public int ConversationId => Snapshot.Conversations[_conversationIndex].Id;

        public ActorRef Actor
        {
            get
            {
                int actorIdx = Snapshot.Nodes[_nodeIndex].ActorIdx;
                return new ActorRef(Snapshot, actorIdx);
            }
        }

        public string VoiceText => Snapshot.Nodes[_nodeIndex].VoiceText;

        public string UIResponseText => Snapshot.Nodes[_nodeIndex].UiResponseText;

        public int PropertyCount => Snapshot.Nodes[_nodeIndex].Properties?.Count ?? 0;

        public NodePropertyRef GetProperty(int index)
        {
            return new NodePropertyRef(Snapshot, Snapshot.Nodes[_nodeIndex].Properties[index]);
        }
        #endregion

        #region Execution
        internal void Initialize(GameScriptDatabase database, JumpTable jumpTable, int conversationIndex, IGameScriptListener listener)
        {
            _database = database;
            _jumpTable = jumpTable;
            _conversationIndex = conversationIndex;
            _listener = listener;
            _nodeIndex = Snapshot.Conversations[conversationIndex].RootNodeIdx;
            SequenceNumber = s_NextSequenceNumber++;
        }

        internal async Awaitable Run()
        {
            ConversationRef conversationRef = new ConversationRef(Snapshot, _conversationIndex);

            try
            {
                // 1. Conversation Enter
                _listener.OnConversationEnter(conversationRef, new ReadyNotifier(_readySource));
                await _readySource.Awaitable;
                _readySource.Reset();

                // Main loop
                while (true)
                {
                    NodeRef nodeRef = new NodeRef(Snapshot, _nodeIndex);
                    Node node = Snapshot.Nodes[_nodeIndex];

                    // Root nodes skip directly to edge evaluation
                    if (node.Type == NodeType.Root)
                        goto EvaluateEdges;

                    // 2. Node Enter
                    _listener.OnNodeEnter(nodeRef, new ReadyNotifier(_readySource));
                    await _readySource.Awaitable;
                    _readySource.Reset();

                    // 3. Action + Speech (type-dependent)
                    if (node.Type == NodeType.Logic)
                    {
                        // Logic nodes: action only, no speech
                        if (node.HasAction)
                        {
                            await ExecuteAction(node);
                        }
                    }
                    else
                    {
                        // Dialogue nodes: action and speech run concurrently
                        await RunActionAndSpeechConcurrently(node, nodeRef);
                    }

                    // 4. Evaluate outgoing edges and find valid targets
                    EvaluateEdges:
                    _choices.Clear();
                    _highestPriorityChoices.Clear();
                    int highestPriority = int.MinValue;
                    bool allSameActor = true;
                    int firstActorIdx = -1;

                    IList<int> outgoingEdgeIndices = node.OutgoingEdgeIndices;
                    int edgeCount = outgoingEdgeIndices?.Count ?? 0;
                    for (int i = 0; i < edgeCount; i++)
                    {
                        int edgeIdx = outgoingEdgeIndices[i];
                        Edge edge = Snapshot.Edges[edgeIdx];
                        int targetNodeIdx = edge.TargetIdx;
                        Node targetNode = Snapshot.Nodes[targetNodeIdx];

                        // Evaluate condition if present
                        bool conditionPassed = true;
                        if (targetNode.HasCondition)
                        {
                            ConditionDelegate condition = _jumpTable.Conditions[targetNodeIdx];
                            if (condition != null)
                            {
                                // Temporarily set node index for condition context
                                int savedNodeIndex = _nodeIndex;
                                try
                                {
                                    _nodeIndex = targetNodeIdx;
                                    conditionPassed = condition(this);
                                }
                                finally
                                {
                                    _nodeIndex = savedNodeIndex;
                                }
                            }
                            else
                            {
                                Debug.LogError($"[GameScript] Node {targetNode.Id} has HasCondition=true but no condition method was found. Check build validation.");
                            }
                        }

                        if (conditionPassed)
                        {
                            NodeRef targetRef = new NodeRef(Snapshot, targetNodeIdx);
                            _choices.Add(targetRef);

                            // Track actor consistency
                            if (_choices.Count == 1)
                            {
                                firstActorIdx = targetNode.ActorIdx;
                            }
                            else if (allSameActor && targetNode.ActorIdx != firstActorIdx)
                            {
                                allSameActor = false;
                            }

                            // Track highest priority choices
                            if (edge.Priority > highestPriority)
                            {
                                highestPriority = edge.Priority;
                                _highestPriorityChoices.Clear();
                                _highestPriorityChoices.Add(targetRef);
                            }
                            else if (edge.Priority == highestPriority)
                            {
                                _highestPriorityChoices.Add(targetRef);
                            }
                        }
                    }

                    // 5. Decision (optional) - if player must choose
                    bool isDecision = _choices.Count > 0 && ShouldShowDecision(node, allSameActor);
                    if (isDecision)
                    {
                        _listener.OnDecision(_choices, new DecisionNotifier(_decisionSource));
                        _nodeIndex = await _decisionSource.Awaitable;
                        _decisionSource.Reset();
                    }
                    else if (_choices.Count > 0)
                    {
                        // Auto-advance via listener (allows custom selection logic)
                        NodeRef selected = _listener.OnAutoDecision(_highestPriorityChoices);
                        if (selected.Index < 0 || selected.Index >= Snapshot.Nodes.Count)
                        {
                            throw new InvalidOperationException(
                                $"OnAutoDecision returned invalid node (index {selected.Index}). " +
                                "Ensure your listener returns one of the provided choices.");
                        }
                        _nodeIndex = selected.Index;
                    }

                    // 6. Node Exit (skip for root nodes)
                    if (node.Type != NodeType.Root)
                    {
                        _listener.OnNodeExit(nodeRef, new ReadyNotifier(_readySource));
                        await _readySource.Awaitable;
                        _readySource.Reset();
                    }

                    // No valid edges - conversation ends
                    if (_choices.Count == 0)
                        break;
                }

                // 7. Conversation Exit
                _listener.OnConversationExit(conversationRef, new ReadyNotifier(_readySource));
                await _readySource.Awaitable;
                _readySource.Reset();

                // 8. Final cleanup signal
                _listener.OnCleanup(conversationRef);
            }
            catch (OperationCanceledException)
            {
                _listener.OnConversationCancelled(conversationRef);
            }
            catch (Exception e)
            {
                _listener.OnError(conversationRef, e);
            }
            finally
            {
                Reset();
            }
        }

        async Awaitable ExecuteAction(Node node)
        {
            ActionDelegate action = _jumpTable.Actions[_nodeIndex];
            if (action != null)
            {
                await action(this, _cts.Token);
            }
            else
            {
                Debug.LogError($"[GameScript] Node {node.Id} has HasAction=true but no action method was found. Check build validation.");
            }
        }

        async Awaitable RunActionAndSpeechConcurrently(Node node, NodeRef nodeRef)
        {
            if (node.HasAction)
            {
                // Both action and speech run concurrently
                _whenAllAwaiter.WhenAll(ExecuteAction(node), AwaitSpeech(nodeRef), _readySource);
            }
            else
            {
                // Speech only
                _listener.OnSpeech(nodeRef, new ReadyNotifier(_readySource));
            }
            await _readySource.Awaitable;
            _readySource.Reset();
        }

        async Awaitable AwaitSpeech(NodeRef nodeRef)
        {
            _listener.OnSpeech(nodeRef, new ReadyNotifier(_speechSource));
            await _speechSource.Awaitable;
            _speechSource.Reset();
        }

        bool ShouldShowDecision(Node currentNode, bool allSameActor)
        {
            // Never show decisions if current node prevents it
            if (currentNode.IsPreventResponse)
                return false;

            // Multiple choices = decision
            if (_choices.Count > 1)
                return allSameActor;

            // Single choice with UI text = decision (unless settings prevent it)
            if (_choices.Count == 1 && !_settings.PreventSingleNodeChoices)
            {
                string responseText = Snapshot.Nodes[_choices[0].Index].UiResponseText;
                return !string.IsNullOrEmpty(responseText) && allSameActor;
            }

            return false;
        }

        void Reset()
        {
            // Only recreate if canceled (disposed CTS can't be reused)
            if (_cts.IsCancellationRequested)
            {
                _cts.Dispose();
                _cts = new CancellationTokenSource();
            }

            _database = null;
            _jumpTable = null;
            _listener = null;
            _conversationIndex = -1;
            _nodeIndex = -1;
            _choices.Clear();
            _highestPriorityChoices.Clear();
        }
        #endregion
    }
}
