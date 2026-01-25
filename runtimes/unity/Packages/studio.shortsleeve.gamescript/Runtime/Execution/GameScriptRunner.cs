using System;
using System.Collections.Generic;
using System.Threading;
using UnityEngine;

namespace GameScript
{
    /// <summary>
    /// The dialogue execution engine. This is a pure C# class that can be instantiated
    /// directly with a database. Use GameScriptBehaviour for Unity Inspector integration.
    /// </summary>
    public sealed class GameScriptRunner
    {
        #region State
        readonly Dictionary<uint, RunnerContext> _contextsActive;
        readonly LinkedList<RunnerContext> _contextsInactive;
        readonly Thread _mainThread;
        readonly GameScriptDatabase _database;
        readonly JumpTable _jumpTable;
        readonly Settings _settings;
        #endregion

        #region Constructor
        /// <summary>
        /// Creates a new runner with the specified database and settings.
        /// </summary>
        public GameScriptRunner(GameScriptDatabase database, Settings settings)
        {
            _database = database ?? throw new ArgumentNullException(nameof(database));
            _settings = settings ?? throw new ArgumentNullException(nameof(settings));
            _mainThread = Thread.CurrentThread;
            _contextsActive = new Dictionary<uint, RunnerContext>();
            _contextsInactive = new LinkedList<RunnerContext>();

            // Build jump table from snapshot
            _jumpTable = JumpTableBuilder.Build(_database.Snapshot);

            // Pre-allocate context pool
            for (uint i = 0; i < _settings.InitialConversationPool; i++)
            {
                _contextsInactive.AddLast(new RunnerContext(_settings));
            }
        }
        #endregion

        #region Public API
        /// <summary>
        /// The database this runner was created with.
        /// </summary>
        public GameScriptDatabase Database => _database;

        /// <summary>
        /// Starts a conversation by index.
        /// </summary>
        public ActiveConversation StartConversation(int conversationIndex, IGameScriptListener listener)
        {
            EnsureMainThread();

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
        /// Starts a conversation by ID.
        /// </summary>
        public ActiveConversation StartConversation(ConversationId conversationId, IGameScriptListener listener)
        {
            ConversationRef conversation = _database.FindConversation(conversationId);
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

            ctx.Cancel();
        }

        /// <summary>
        /// Stops all active conversations.
        /// </summary>
        public void StopAllConversations()
        {
            EnsureMainThread();

            // Collect context IDs first to avoid modifying dictionary during iteration
            // Cancel modifies _contextsActive via ContextRelease, so we snapshot keys first
            if (_contextsActive.Count == 0) return;

            uint[] contextIds = new uint[_contextsActive.Count];
            _contextsActive.Keys.CopyTo(contextIds, 0);

            foreach (uint contextId in contextIds)
            {
                if (_contextsActive.TryGetValue(contextId, out RunnerContext ctx))
                {
                    ctx.Cancel();
                }
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
            }
            else
            {
                LinkedListNode<RunnerContext> node = _contextsInactive.Last;
                _contextsInactive.RemoveLast();
                context = node.Value;
            }

            // Add to active dictionary using ContextId as key (O(1) insert and lookup)
            _contextsActive.Add(context.ContextId, context);
            return context;
        }

        void ContextRelease(RunnerContext context)
        {
            // O(1) removal from active dictionary
            _contextsActive.Remove(context.ContextId);

            // Return to inactive pool
            _contextsInactive.AddLast(context);
        }

        RunnerContext FindContextActive(ActiveConversation active)
        {
            // O(1) lookup by ContextId
            if (!_contextsActive.TryGetValue(active.ContextId, out RunnerContext context))
                return null;

            // Validate sequence to detect stale handles after context reuse
            if (context.SequenceNumber != active.SequenceNumber)
                return null;

            return context;
        }

        void EnsureMainThread()
        {
            if (_mainThread != Thread.CurrentThread)
                throw new InvalidOperationException("GameScript APIs must be called from the main thread");
        }
        #endregion
    }
}
