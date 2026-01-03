using System;
using System.Collections.Generic;
using UnityEngine;

namespace GameScript
{
    public class RunnerContext : IDialogueContext
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
        Snapshot _snapshot;
        JumpTable _jumpTable;
        IGameScriptListener _listener;
        Settings _settings;

        int _conversationIndex;
        int _nodeIndex;

        AwaitableCompletionSource _readySource;
        AwaitableCompletionSource<int> _decisionSource;

        // Reusable lists for collecting data without allocation
        readonly List<NodeRef> _choices;
        readonly List<NodeProperty> _properties;
        int _propertiesCachedForNodeIndex;
        #endregion

        #region Constructor
        internal RunnerContext(Settings settings)
        {
            ContextId = s_NextContextId++;
            _settings = settings;
            _readySource = new AwaitableCompletionSource();
            _decisionSource = new AwaitableCompletionSource<int>();
            _choices = new List<NodeRef>(DefaultChoiceCapacity);
            _properties = new List<NodeProperty>();
            _propertiesCachedForNodeIndex = -1;
        }
        #endregion

        #region IDialogueContext Implementation
        public int NodeId => _snapshot.Nodes[_nodeIndex].Id;

        public int ConversationId => _snapshot.Conversations[_conversationIndex].Id;

        public Actor Actor
        {
            get
            {
                int actorIdx = _snapshot.Nodes[_nodeIndex].ActorIdx;
                return _snapshot.Actors[actorIdx];
            }
        }

        public string VoiceText => _snapshot.Nodes[_nodeIndex].VoiceText;

        public string UIResponseText => _snapshot.Nodes[_nodeIndex].UiResponseText;

        public IReadOnlyList<NodeProperty> Properties
        {
            get
            {
                if (_propertiesCachedForNodeIndex != _nodeIndex)
                {
                    _properties.Clear();
                    Node node = _snapshot.Nodes[_nodeIndex];
                    IList<NodeProperty> props = node.Properties;
                    if (props != null)
                    {
                        int count = props.Count;
                        for (int i = 0; i < count; i++)
                        {
                            _properties.Add(props[i]);
                        }
                    }
                    _propertiesCachedForNodeIndex = _nodeIndex;
                }
                return _properties;
            }
        }
        #endregion

        #region Execution
        internal void Initialize(Snapshot snapshot, JumpTable jumpTable, int conversationIndex, IGameScriptListener listener)
        {
            _snapshot = snapshot;
            _jumpTable = jumpTable;
            _conversationIndex = conversationIndex;
            _listener = listener;
            _nodeIndex = _snapshot.Conversations[conversationIndex].RootNodeIdx;
            SequenceNumber = s_NextSequenceNumber++;
        }

        internal async Awaitable Run()
        {
            ConversationRef conversationRef = new ConversationRef(_snapshot, _conversationIndex);

            try
            {
                // Conversation Enter
                _listener.OnConversationEnter(conversationRef, new ReadyNotifier(_readySource));
                await _readySource.Awaitable;
                _readySource.Reset();

                // Main loop
                while (true)
                {
                    NodeRef nodeRef = new NodeRef(_snapshot, _nodeIndex);

                    // Node Enter
                    _listener.OnNodeEnter(nodeRef, new ReadyNotifier(_readySource));
                    await _readySource.Awaitable;
                    _readySource.Reset();

                    // Execute Action
                    Node node = _snapshot.Nodes[_nodeIndex];
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
                        Edge edge = _snapshot.Edges[edgeIdx];
                        int targetNodeIdx = edge.TargetIdx;
                        Node targetNode = _snapshot.Nodes[targetNodeIdx];

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
                            NodeRef targetRef = new NodeRef(_snapshot, targetNodeIdx);
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
                string responseText = _snapshot.Nodes[_choices[0].Index].UiResponseText;
                return !string.IsNullOrEmpty(responseText) && allSameActor;
            }

            return false;
        }

        void Reset()
        {
            _snapshot = null;
            _jumpTable = null;
            _listener = null;
            _conversationIndex = -1;
            _nodeIndex = -1;
            _propertiesCachedForNodeIndex = -1;
            _choices.Clear();
            _properties.Clear();
        }
        #endregion
    }
}
