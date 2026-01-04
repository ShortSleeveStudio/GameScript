using System;
using System.Collections.Generic;
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
        AwaitableCompletionSource<int> _decisionSource;

        // Reusable list for collecting choices without allocation
        readonly List<NodeRef> _choices;
        #endregion

        #region Constructor
        internal RunnerContext(Settings settings)
        {
            ContextId = s_NextContextId++;
            _settings = settings;
            _readySource = new AwaitableCompletionSource();
            _decisionSource = new AwaitableCompletionSource<int>();
            _choices = new List<NodeRef>(DefaultChoiceCapacity);
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
                // Conversation Enter
                _listener.OnConversationEnter(conversationRef, new ReadyNotifier(_readySource));
                await _readySource.Awaitable;
                _readySource.Reset();

                // Main loop
                while (true)
                {
                    NodeRef nodeRef = new NodeRef(Snapshot, _nodeIndex);

                    // Node Enter
                    _listener.OnNodeEnter(nodeRef, new ReadyNotifier(_readySource));
                    await _readySource.Awaitable;
                    _readySource.Reset();

                    // Execute Action
                    Node node = Snapshot.Nodes[_nodeIndex];
                    if (node.HasAction)
                    {
                        ActionDelegate action = _jumpTable.Actions[_nodeIndex];
                        if (action != null)
                        {
                            await action(this);
                        }
                        else
                        {
                            Debug.LogError($"[GameScript] Node {node.Id} has HasAction=true but no action method was found. Check build validation.");
                        }
                    }

                    // Evaluate outgoing edges and find valid targets
                    _choices.Clear();
                    int highestPriority = int.MinValue;
                    int highestPriorityNodeIndex = -1;
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

                            // Track highest priority
                            if (edge.Priority > highestPriority)
                            {
                                highestPriority = edge.Priority;
                                highestPriorityNodeIndex = targetNodeIdx;
                            }
                        }
                    }

                    // No valid edges - conversation ends
                    if (_choices.Count == 0)
                    {
                        _listener.OnNodeExit(nodeRef, new ReadyNotifier(_readySource));
                        await _readySource.Awaitable;
                        _readySource.Reset();
                        break;
                    }

                    // Determine if this is a player decision
                    bool isDecision = ShouldShowDecision(node, allSameActor);

                    if (isDecision)
                    {
                        // Player choice
                        _listener.OnNodeExit(_choices, new DecisionNotifier(_decisionSource));
                        _nodeIndex = await _decisionSource.Awaitable;
                        _decisionSource.Reset();
                    }
                    else
                    {
                        // Auto-advance to highest priority node
                        _listener.OnNodeExit(nodeRef, new ReadyNotifier(_readySource));
                        await _readySource.Awaitable;
                        _readySource.Reset();
                        _nodeIndex = highestPriorityNodeIndex;
                    }
                }

                // Conversation Exit
                _listener.OnConversationExit(conversationRef, new ReadyNotifier(_readySource));
                await _readySource.Awaitable;
                _readySource.Reset();

                // Final cleanup signal
                _listener.OnCleanup(conversationRef);
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
            _database = null;
            _jumpTable = null;
            _listener = null;
            _conversationIndex = -1;
            _nodeIndex = -1;
            _choices.Clear();
        }
        #endregion
    }
}
