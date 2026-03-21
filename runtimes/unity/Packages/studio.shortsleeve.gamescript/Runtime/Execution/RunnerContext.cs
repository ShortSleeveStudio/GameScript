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
        GameScriptRunner _runner;

        int _conversationIndex;
        int _nodeIndex;

        // Access snapshot through database to support live locale switching
        Snapshot Snapshot => _database.Snapshot;

        // Cached resolved texts for the current node (set before OnNodeEnter)
        string _cachedVoiceText;
        string _cachedUIResponseText;

        // For concurrent action+speech via WhenAllAwaiter
        AwaitableCompletionSource _speechSource;
        WhenAllAwaiter _whenAllAwaiter;

        // Reusable lists for collecting choices without allocation
        readonly List<ChoiceRef> _choices;
        readonly List<ChoiceRef> _highestPriorityChoices;

        // Cancellation support
        CancellationTokenSource _cts;
        bool _cancelHandlerCalled;
        #endregion

        #region Cancellation
        public CancellationToken CancellationToken => _cts.Token;

        internal void Cancel()
        {
            _cts.Cancel();

            // Unblock concurrent speech (needed for WhenAllAwaiter)
            _speechSource.TrySetCanceled();

            // Immediately call OnConversationCancelled to unblock completion sources
            // This ensures implementations can cancel their awaitable sources without allocating
            // token.Register() callbacks or waiting for an exception to propagate
            if (!_cancelHandlerCalled)
            {
                _cancelHandlerCalled = true;
                _ = CallCancelHandlerAsync();
            }
        }

        async Awaitable CallCancelHandlerAsync()
        {
            ConversationRef conversationRef = new ConversationRef(Snapshot, _conversationIndex);
            try
            {
                await _listener.OnConversationCancelled(conversationRef);
            }
            catch (Exception ex)
            {
                Debug.LogError($"[GameScript] Error in OnConversationCancelled: {ex}");
            }
        }
        #endregion

        #region Constructor
        internal RunnerContext(Settings settings)
        {
            ContextId = s_NextContextId++;
            _settings = settings;
            _cts = new CancellationTokenSource();
            _speechSource = new AwaitableCompletionSource();
            _whenAllAwaiter = new WhenAllAwaiter();
            _choices = new List<ChoiceRef>(DefaultChoiceCapacity);
            _highestPriorityChoices = new List<ChoiceRef>(DefaultChoiceCapacity);
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

        /// <inheritdoc/>
        public string VoiceText => _cachedVoiceText;

        /// <inheritdoc/>
        public string UIResponseText => _cachedUIResponseText;

        /// <inheritdoc/>
        public int VoiceTextLocalizationIdx => Snapshot.Nodes[_nodeIndex].VoiceTextIdx;

        /// <inheritdoc/>
        public int UIResponseTextLocalizationIdx => Snapshot.Nodes[_nodeIndex].UiResponseTextIdx;

        public int PropertyCount => Snapshot.Nodes[_nodeIndex].Properties?.Count ?? 0;

        public NodePropertyRef GetProperty(int index)
        {
            return new NodePropertyRef(Snapshot, Snapshot.Nodes[_nodeIndex].Properties[index]);
        }
        #endregion

        #region Execution
        internal void Initialize(GameScriptDatabase database, JumpTable jumpTable, int conversationIndex, IGameScriptListener listener, GameScriptRunner runner)
        {
            _database = database;
            _jumpTable = jumpTable;
            _conversationIndex = conversationIndex;
            _listener = listener;
            _runner = runner;
            _nodeIndex = Snapshot.Conversations[conversationIndex].RootNodeIdx;
            SequenceNumber = s_NextSequenceNumber++;
        }

        internal async Awaitable Run()
        {
            ConversationRef conversationRef = new ConversationRef(Snapshot, _conversationIndex);

            try
            {
                // 1. Conversation Enter
                await _listener.OnConversationEnter(conversationRef, _cts.Token);

                // Main loop
                while (true)
                {
                    Node node = Snapshot.Nodes[_nodeIndex];

                    // Root nodes skip directly to edge evaluation
                    if (node.Type == NodeType.Root)
                        goto EvaluateEdges;

                    // Resolve and cache voice/UI response text for this node
                    CacheNodeTexts(node);

                    NodeRef nodeRef = new NodeRef(Snapshot, _nodeIndex);

                    // 2. Node Enter
                    await _listener.OnNodeEnter(nodeRef, _cts.Token);

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
                            // Resolve UI response text for this choice via the listener
                            string resolvedChoiceText = null;
                            int uiIdx = targetNode.UiResponseTextIdx;
                            if (uiIdx >= 0)
                            {
                                LocalizationRef locRef = new LocalizationRef(Snapshot, uiIdx);
                                NodeRef targetNodeRef = new NodeRef(Snapshot, targetNodeIdx);
                                TextResolutionParams choiceParams = _listener.OnDecisionParams(locRef, targetNodeRef);
                                resolvedChoiceText = _runner.ResolveText(uiIdx, targetNodeRef, choiceParams);
                            }

                            ChoiceRef targetChoiceRef = new ChoiceRef(Snapshot, targetNodeIdx, resolvedChoiceText);
                            _choices.Add(targetChoiceRef);

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
                                _highestPriorityChoices.Add(targetChoiceRef);
                            }
                            else if (edge.Priority == highestPriority)
                            {
                                _highestPriorityChoices.Add(targetChoiceRef);
                            }
                        }
                    }

                    // Re-acquire nodeRef after edge evaluation (node variable still valid, but
                    // _nodeIndex may have been temporarily mutated during condition evaluation)
                    NodeRef currentNodeRef = new NodeRef(Snapshot, _nodeIndex);

                    // 5. Decision (optional) - if player must choose
                    bool isDecision = _choices.Count > 0 && ShouldShowDecision(node, allSameActor);
                    if (isDecision)
                    {
                        ChoiceRef selected = await _listener.OnDecision(_choices, _cts.Token);
                        _nodeIndex = selected.Index;
                    }
                    else if (_choices.Count > 0)
                    {
                        // Auto-advance via listener (allows custom selection logic)
                        ChoiceRef selected = _listener.OnAutoDecision(_highestPriorityChoices);

                        // Validate selection is one of the valid choices
                        bool foundInChoices = false;
                        for (int i = 0; i < _choices.Count; i++)
                        {
                            if (_choices[i].Index == selected.Index)
                            {
                                foundInChoices = true;
                                break;
                            }
                        }

                        if (!foundInChoices)
                        {
                            throw new InvalidOperationException(
                                $"OnAutoDecision returned node (index {selected.Index}) that is not in the valid choices list. " +
                                "Ensure your listener returns one of the provided choices.");
                        }

                        _nodeIndex = selected.Index;
                    }

                    // 6. Node Exit (skip for root nodes)
                    if (node.Type != NodeType.Root)
                    {
                        await _listener.OnNodeExit(currentNodeRef, _cts.Token);
                    }

                    // No valid edges - conversation ends
                    if (_choices.Count == 0)
                        break;
                }

                // 7. Conversation Exit
                await _listener.OnConversationExit(conversationRef, _cts.Token);
            }
            catch (OperationCanceledException)
            {
                // OnConversationCancelled already called in Cancel()
                // Just proceed to cleanup
            }
            catch (Exception e)
            {
                try
                {
                    await _listener.OnError(conversationRef, e);
                }
                catch (Exception ex)
                {
                    Debug.LogError($"[GameScript] Error in OnError: {ex}");
                }
            }
            finally
            {
                // 8. Final cleanup - always called (normal exit, cancellation, or error)
                try
                {
                    await _listener.OnCleanup(conversationRef);
                }
                catch (Exception e)
                {
                    Debug.LogError($"[GameScript] Error in OnCleanup: {e}");
                }

                Reset();
            }
        }

        // Resolves and caches voice text and UI response text for the current node.
        // Voice text uses OnSpeechParams from the listener; UI response text uses static-gender
        // resolution (it reflects the current node's own response text, not a choice's).
        void CacheNodeTexts(Node node)
        {
            // Voice text
            int voiceIdx = node.VoiceTextIdx;
            if (voiceIdx >= 0)
            {
                LocalizationRef locRef = new LocalizationRef(Snapshot, voiceIdx);
                NodeRef nodeRef = new NodeRef(Snapshot, _nodeIndex);
                TextResolutionParams speechParams = _listener.OnSpeechParams(locRef, nodeRef);
                _cachedVoiceText = _runner.ResolveText(voiceIdx, nodeRef, speechParams);
            }
            else
            {
                _cachedVoiceText = null;
            }

            // UI response text — static-gender resolution (no OnSpeechParams call for this)
            int uiIdx = node.UiResponseTextIdx;
            if (uiIdx >= 0)
            {
                Localization loc = Snapshot.Localizations[uiIdx];
                GenderCategory gender = NodeRef.ResolveStaticGender(loc, Snapshot);
                _cachedUIResponseText = VariantResolver.Resolve(loc, gender, PluralCategory.Other);
            }
            else
            {
                _cachedUIResponseText = null;
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
                _whenAllAwaiter.WhenAll(
                    ExecuteAction(node),
                    _listener.OnSpeech(nodeRef, _cachedVoiceText, _cts.Token),
                    _speechSource
                );
                try
                {
                    await _speechSource.Awaitable;
                }
                finally
                {
                    // Detach awaiter first to prevent ghost completions, then reset source
                    _whenAllAwaiter.Cancel();
                    _speechSource.Reset();
                }
            }
            else
            {
                // Speech only
                await _listener.OnSpeech(nodeRef, _cachedVoiceText, _cts.Token);
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
                // Use the index sentinel to check for UI text rather than the resolved string,
                // so this check never depends on resolution results
                return Snapshot.Nodes[_choices[0].Index].UiResponseTextIdx != -1 && allSameActor;
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

            // Reset speech source in case Cancel() was called outside RunActionAndSpeechConcurrently
            _speechSource.Reset();

            // Reset cancellation handler flag for next conversation
            _cancelHandlerCalled = false;

            _database = null;
            _jumpTable = null;
            _listener = null;
            _runner = null;
            _conversationIndex = -1;
            _nodeIndex = -1;
            _cachedVoiceText = null;
            _cachedUIResponseText = null;
            _choices.Clear();
            _highestPriorityChoices.Clear();
        }
        #endregion
    }
}
