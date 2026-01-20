using UnityEngine;

namespace GameScript
{
    /// <summary>
    /// Utility for working with Awaitable without allocation.
    /// </summary>
    public static class AwaitableUtility
    {
        /// <summary>
        /// Returns a completed Awaitable that can be awaited safely.
        /// Each call returns a fresh instance from Unity's internal pool.
        /// </summary>
#pragma warning disable CS1998 // Async method lacks 'await' operators
        public static async Awaitable Completed()
        {
            return;
        }
#pragma warning restore CS1998
    }
}
