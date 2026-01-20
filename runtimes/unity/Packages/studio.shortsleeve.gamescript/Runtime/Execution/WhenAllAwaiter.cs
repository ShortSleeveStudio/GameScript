using System;
using System.Threading;
using UnityEngine;

namespace GameScript
{
    /// <summary>
    /// Reusable helper for running two awaitables concurrently.
    /// Modeled after UniTask's WhenAll pattern - uses GetAwaiter().OnCompleted()
    /// instead of async void to avoid allocation and ensure proper error handling.
    ///
    /// IMPORTANT: This class is not re-entrant. Each RunnerContext should have its own
    /// instance, and only one WhenAll operation should be active at a time per instance.
    ///
    /// Lifecycle:
    /// 1. Call WhenAll(...) to start watching two tasks
    /// 2. Await the completion source
    /// 3. In a finally block, call Cancel() then Reset() the completion source
    ///
    /// The Cancel() call is critical - it prevents "ghost completions" where a slow task
    /// from a previous operation completes after the source has been reset for reuse.
    /// </summary>
    public sealed class WhenAllAwaiter
    {
        int _pendingCount;
        Exception _exception;
        volatile AwaitableCompletionSource _completionSource;
        Awaitable.Awaiter _awaiter1;
        Awaitable.Awaiter _awaiter2;

        // Cached delegates to avoid allocation on each OnCompleted call
        readonly Action _continuation1;
        readonly Action _continuation2;

        public WhenAllAwaiter()
        {
            _continuation1 = TryInvokeContinuation1;
            _continuation2 = TryInvokeContinuation2;
        }

        /// <summary>
        /// Runs two awaitables concurrently. Signals the provided completion source when both complete.
        /// Caller is responsible for awaiting the completion source, then calling Cancel() and Reset().
        /// </summary>
        public void WhenAll(Awaitable task1, Awaitable task2, AwaitableCompletionSource completionSource)
        {
            // Store completion source and reset state.
            // If WhenAll is called again before the old one finished, we "detach" from the
            // old source by overwriting it - old continuations will see the reference mismatch.
            _completionSource = completionSource;
            _pendingCount = 2;
            _exception = null;

            // Get awaiters - store as fields to avoid closure allocation
            _awaiter1 = task1.GetAwaiter();
            _awaiter2 = task2.GetAwaiter();

            // Check if already completed synchronously
            if (_awaiter1.IsCompleted)
            {
                TryInvokeContinuation1();
            }
            else
            {
                _awaiter1.OnCompleted(_continuation1);
            }

            if (_awaiter2.IsCompleted)
            {
                TryInvokeContinuation2();
            }
            else
            {
                _awaiter2.OnCompleted(_continuation2);
            }
        }

        /// <summary>
        /// Detaches from the completion source to prevent late-arriving task completions
        /// from affecting a reset/reused source. Call this in a finally block after awaiting.
        /// </summary>
        public void Cancel()
        {
            _completionSource = null;
            _pendingCount = 0;
        }

        void TryInvokeContinuation1()
        {
            try
            {
                _awaiter1.GetResult();
            }
            catch (Exception ex)
            {
                Interlocked.CompareExchange(ref _exception, ex, null);
            }

            OnTaskCompleted();
        }

        void TryInvokeContinuation2()
        {
            try
            {
                _awaiter2.GetResult();
            }
            catch (Exception ex)
            {
                Interlocked.CompareExchange(ref _exception, ex, null);
            }

            OnTaskCompleted();
        }

        void OnTaskCompleted()
        {
            // Capture reference - if null, we've been cancelled/detached
            var source = _completionSource;
            if (source == null)
                return;

            // When all complete, signal the completion source
            if (Interlocked.Decrement(ref _pendingCount) == 0)
            {
                // Final check: ensure a new WhenAll didn't start while this continuation was in flight
                if (source != _completionSource)
                    return;

                if (_exception != null)
                    source.TrySetException(_exception);
                else
                    source.TrySetResult();

                // Prevent double-firing
                _completionSource = null;
            }
        }
    }
}
