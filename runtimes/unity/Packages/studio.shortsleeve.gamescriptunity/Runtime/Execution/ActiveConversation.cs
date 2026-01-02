namespace GameScript
{
    public readonly struct ActiveConversation
    {
        internal readonly GameScriptRunner Runner;
        internal readonly uint SequenceNumber;
        internal readonly uint ContextId;

        internal ActiveConversation(GameScriptRunner runner, uint sequenceNumber, uint contextId)
        {
            Runner = runner;
            SequenceNumber = sequenceNumber;
            ContextId = contextId;
        }

        /// <summary>
        /// Stops the conversation.
        /// </summary>
        public void Stop() => Runner.StopConversation(this);

        /// <summary>
        /// Checks if the conversation is still active.
        /// </summary>
        public bool IsActive() => Runner.IsActive(this);
    }
}
