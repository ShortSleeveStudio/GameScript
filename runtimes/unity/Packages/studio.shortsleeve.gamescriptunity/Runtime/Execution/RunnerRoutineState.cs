using System;
using System.Collections.Generic;

namespace GameScript
{
    class RunnerRoutineState
    {
        private const int k_InitialBlockPool = 8; // Conservative guess
        private int m_BlocksInUse;
        private List<RunnerScheduledBlock> m_Blocks;
        private bool[] m_FlagState;
        private bool m_IsCondition;
        private bool m_ConditionResult;
        private RunnerContext m_RunnerContext;

        public RunnerRoutineState(uint maxFlags, RunnerContext context)
        {
            m_RunnerContext = context; // order matters
            m_Blocks = new(k_InitialBlockPool);
            EnsurePoolSize(k_InitialBlockPool);
            m_BlocksInUse = 0;
            m_FlagState = new bool[maxFlags];
            m_IsCondition = false;
            m_ConditionResult = false;
        }

        public bool IsRoutineExecuted()
        {
            for (int i = 0; i < m_BlocksInUse; i++)
            {
                RunnerScheduledBlock block = m_Blocks[i];
                if (!block.HasExecuted())
                    return false;
                if (!block.HaveAllSignalsFired())
                    return false;
            }
            return true;
        }

        public void SetBlocksInUse(int blockCount)
        {
            m_BlocksInUse = blockCount;
            EnsurePoolSize(m_BlocksInUse);
        }

        public bool IsBlockExecuted(int blockIndex) => m_Blocks[blockIndex].HasExecuted();

        public void SetBlockExecuted(int blockIndex) => m_Blocks[blockIndex].SetExecuted();

        public bool HaveBlockFlagsFired(int blockIndex) => m_Blocks[blockIndex].HaveFlagsFired();

        public void SetBlockFlagsFired(int blockIndex) => m_Blocks[blockIndex].SetFlagsFired();

        public Lease AcquireLease(int blockIndex) => m_Blocks[blockIndex].AcquireLease();

        public bool HaveBlockSignalsFired(int blockIndex) =>
            m_Blocks[blockIndex].HaveAllSignalsFired();

        public bool GetConditionResult()
        {
            if (!m_IsCondition)
            {
                throw new Exception(
                    "Tried to access condition result from a non-condition routine"
                );
            }
            return m_ConditionResult;
        }

        public void SetConditionResult(bool result)
        {
            m_IsCondition = true;
            m_ConditionResult = result;
        }

        public void SetFlag(int flagIndex) => m_FlagState[flagIndex] = true;

        public bool IsFlagSet(int flagIndex) => m_FlagState[flagIndex];

        public void Reset()
        {
            m_ConditionResult = false;
            for (int i = 0; i < m_BlocksInUse; i++)
                m_Blocks[i].Reset();
            for (int i = 0; i < m_FlagState.Length; i++)
                m_FlagState[i] = false;
            m_IsCondition = false;
            m_BlocksInUse = 0;
        }

        private void EnsurePoolSize(int poolSize)
        {
            for (int i = m_Blocks.Count; i < poolSize; i++)
                m_Blocks.Add(new(m_RunnerContext));
        }
    }
}
