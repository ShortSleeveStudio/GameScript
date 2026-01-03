using System;
using System.Collections.Generic;
using System.Threading;
using UnityEngine;

namespace GameScript
{
    public sealed class GameScriptRunner : MonoBehaviour
    {
        #region Inspector
        [Header("Runner Settings")]
        [SerializeField]
#pragma warning disable CS0414
        int _executionOrder = -1;
#pragma warning restore CS0414

        [SerializeField]
        Settings _settings;
        #endregion

        #region State
        LinkedList<RunnerContext> _contextsActive;
        LinkedList<RunnerContext> _contextsInactive;
        Thread _mainThread;
        GameScriptDatabase _database;
        JumpTable _jumpTable;
        #endregion

        #region Public API
        public GameScriptDatabase Database => _database;

        public async Awaitable Initialize(CancellationToken token = default)
        {
            if (_database != null)
                throw new InvalidOperationException("GameScript has already been initialized");

            _database = new GameScriptDatabase();
            await _database.Initialize(_settings, token);

            // Build jump table from snapshot
            _jumpTable = JumpTableBuilder.Build(_database.Snapshot);
        }

        /// <summary>
        /// Starts a conversation by index.
        /// </summary>
        public ActiveConversation StartConversation(int conversationIndex, IGameScriptListener listener)
        {
            EnsureMainThread();
            EnsureInitialized();

            RunnerContext context = ContextAcquire();
            context.Initialize(_database, _jumpTable, conversationIndex, listener);

            // Start the conversation - it runs asynchronously and releases itself when done
            _ = RunConversationAsync(context);

            return new ActiveConversation(this, context.SequenceNumber, context.ContextId);
        }

        /// <summary>
        /// Starts a conversation using a ConversationRef.
        /// </summary>
        public ActiveConversation StartConversation(ConversationRef conversation, IGameScriptListener listener)
        {
            return StartConversation(conversation.Index, listener);
        }

        /// <summary>
        /// Checks if a conversation is still active.
        /// </summary>
        public bool IsActive(ActiveConversation active)
        {
            EnsureMainThread();
            RunnerContext ctx = FindContextActive(active);
            return ctx != null;
        }

        /// <summary>
        /// Stops a specific conversation.
        /// </summary>
        public void StopConversation(ActiveConversation active)
        {
            EnsureMainThread();
            RunnerContext ctx = FindContextActive(active);
            if (ctx == null)
                return; // Already ended, idempotent

            ContextRelease(ctx);
        }

        /// <summary>
        /// Stops all active conversations.
        /// </summary>
        public void StopAllConversations()
        {
            EnsureMainThread();
            LinkedListNode<RunnerContext> node = _contextsActive.First;
            while (node != null)
            {
                LinkedListNode<RunnerContext> next = node.Next;
                ContextRelease(node);
                node = next;
            }
        }
        #endregion

        #region Unity Lifecycle
        void Awake()
        {
            _mainThread = Thread.CurrentThread;
            _contextsActive = new LinkedList<RunnerContext>();
            _contextsInactive = new LinkedList<RunnerContext>();

            // Pre-allocate context pool
            for (uint i = 0; i < _settings.InitialConversationPool; i++)
            {
                _contextsInactive.AddLast(new RunnerContext(_settings));
            }
        }
        #endregion

        #region Helpers
        async Awaitable RunConversationAsync(RunnerContext context)
        {
            try
            {
                await context.Run();
            }
            catch (Exception e)
            {
                Debug.LogException(e);
            }
            finally
            {
                // Context is done, return to pool
                ContextRelease(context);
            }
        }

        RunnerContext ContextAcquire()
        {
            RunnerContext context;
            if (_contextsInactive.Count == 0)
            {
                context = new RunnerContext(_settings);
                _contextsActive.AddLast(context);
            }
            else
            {
                LinkedListNode<RunnerContext> node = _contextsInactive.Last;
                _contextsInactive.RemoveLast();
                _contextsActive.AddLast(node);
                context = node.Value;
            }
            return context;
        }

        void ContextRelease(RunnerContext context)
        {
            LinkedListNode<RunnerContext> node = _contextsActive.Find(context);
            if (node != null)
                ContextRelease(node);
        }

        void ContextRelease(LinkedListNode<RunnerContext> node)
        {
            _contextsActive.Remove(node);
            _contextsInactive.AddLast(node);
        }

        RunnerContext FindContextActive(ActiveConversation active)
        {
            LinkedListNode<RunnerContext> node = _contextsActive.First;
            while (node != null)
            {
                if (node.Value.ContextId == active.ContextId)
                {
                    if (node.Value.SequenceNumber != active.SequenceNumber)
                        return null;
                    return node.Value;
                }
                node = node.Next;
            }
            return null;
        }

        void EnsureMainThread()
        {
            if (_mainThread != Thread.CurrentThread)
                throw new InvalidOperationException("GameScript APIs must be called from the main thread");
        }

        void EnsureInitialized()
        {
            if (_database == null)
                throw new InvalidOperationException("GameScript has not been initialized. Call Initialize() first.");
        }
        #endregion

        #region Editor
#if UNITY_EDITOR
        void OnValidate()
        {
            UnityEditor.MonoScript monoScript = UnityEditor.MonoScript.FromMonoBehaviour(this);
            int currentExecutionOrder = UnityEditor.MonoImporter.GetExecutionOrder(monoScript);
            if (currentExecutionOrder != _executionOrder)
            {
                UnityEditor.MonoImporter.SetExecutionOrder(monoScript, _executionOrder);
            }

            if (!_settings)
                _settings = Settings.GetSettings();
        }
#endif
        #endregion
    }
}
