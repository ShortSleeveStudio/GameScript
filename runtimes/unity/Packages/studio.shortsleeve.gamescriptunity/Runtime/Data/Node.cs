using System;

namespace GameScript
{
    [Serializable]
    public class Node : BaseData<Node>
    {
        public Actor Actor;
        public Localization UIResponseText; // Null when there was no text in any language
        public Localization VoiceText; // Null when there was no text in any language
        public uint Condition; // Index into routine array
        public uint Code; // Index into routine array
        public bool IsPreventResponse;
        public Edge[] OutgoingEdges;
        public Property[] Properties;
    }
}
