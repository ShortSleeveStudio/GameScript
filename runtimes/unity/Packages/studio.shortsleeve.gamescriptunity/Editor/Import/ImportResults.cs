using System.Collections.Generic;

namespace GameScript
{
    abstract class ImportResult
    {
        public bool WasError;
    }

    class DbCodeGeneratorResult : ImportResult { }

    class TranspilerResult : ImportResult
    {
        public uint MaxFlags;
        public Dictionary<uint, uint> RoutineIdToIndex;

        public override string ToString() => $"MaxFlags = {MaxFlags}";
    }

    class ConversationDataGeneratorResult : ImportResult { }

    class ReferenceGeneratorResult : ImportResult { }
}
