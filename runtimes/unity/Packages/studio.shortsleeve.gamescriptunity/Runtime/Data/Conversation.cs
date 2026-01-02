using System;

namespace GameScript
{
    [Serializable]
    public class Conversation : BaseData<Conversation>
    {
        public string Name;
        public Node RootNode;
        public Node[] Nodes;
    }
}
