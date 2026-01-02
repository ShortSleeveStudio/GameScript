namespace GameScript
{
    public struct Lease
    {
        private bool m_Signalled;
        private Signal m_Signal;
        private RunnerContext m_Context;
        private uint m_OriginalSequenceNumber;

        public static Lease DummyLease() => new() { m_Signalled = true };

        internal Lease(uint sequenceNumber, RunnerContext context, Signal signal)
        {
            m_Signalled = false;
            m_Signal = signal;
            m_Context = context;
            m_OriginalSequenceNumber = sequenceNumber;
        }

        public bool IsValid() =>
            !m_Signalled && m_Context.SequenceNumber == m_OriginalSequenceNumber;

        public void Release()
        {
            if (!IsValid())
                return;
            m_Signalled = true;
            m_Signal();
        }
    }

    internal delegate void Signal();
}
