using System;

namespace GameScript
{
    [Serializable]
    public class Edge : BaseData<Edge>
    {
        public Node Source;
        public Node Target;
        public byte Priority;
    }
}
