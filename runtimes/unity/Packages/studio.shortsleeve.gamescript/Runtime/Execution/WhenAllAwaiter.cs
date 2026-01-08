using System;
using System.Threading;
using UnityEngine;

namespace GameScript
{
    /// <summary>
    /// Reusable helper for running two awaitables concurrently.
    /// Modeled after UniTask's WhenAll pattern - uses GetAwaiter().OnCompleted()
    /// instead of async void to avoid allocation and ensure proper error handling.
    /// </summary>
    public sealed class WhenAllAwaiter
    {
        int _pendingCount;
        Exception _exception;
        AwaitableCompletionSource _completionSource;
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
        /// Caller is responsible for awaiting and resetting the completion source.
        /// </summary>
        public void WhenAll(Awaitable task1, Awaitable task2, AwaitableCompletionSource completionSource)
        {
            // Store completion source and reset state
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
            // When all complete, signal the completion source
            if (Interlocked.Decrement(ref _pendingCount) == 0)
            {
                if (_exception != null)
                {
                    _completionSource.SetException(_exception);
                }
                else
                {
                    _completionSource.SetResult();
                }
            }
        }
    }
}
