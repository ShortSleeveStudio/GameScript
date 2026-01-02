namespace GameScript
{
    /// <summary>
    /// Lightweight wrapper around a FlatBuffers Node providing convenient property access.
    /// This is a struct holding a snapshot reference and index - zero allocation.
    /// </summary>
    public readonly struct NodeRef
    {
        readonly Snapshot _snapshot;
        readonly int _index;

        internal NodeRef(Snapshot snapshot, int index)
        {
            _snapshot = snapshot;
            _index = index;
        }

        /// <summary>
        /// The index of this node in the snapshot's Nodes array.
        /// </summary>
        public int Index => _index;

        /// <summary>
        /// The original database ID of this node.
        /// </summary>
        public int Id => _snapshot.Nodes(_index).Value.Id;

        /// <summary>
        /// The type of this node (Root or Dialogue).
        /// </summary>
        public NodeType Type => _snapshot.Nodes(_index).Value.Type;

        /// <summary>
        /// The actor for this node.
        /// </summary>
        public ActorRef Actor
        {
            get
            {
                int actorIdx = _snapshot.Nodes(_index).Value.ActorIdx;
                return new ActorRef(_snapshot, actorIdx);
            }
        }

        /// <summary>
        /// The localized voice/dialogue text for this node.
        /// </summary>
        public string VoiceText => _snapshot.Nodes(_index).Value.VoiceText;

        /// <summary>
        /// The localized UI response text (for choice buttons) for this node.
        /// </summary>
        public string UIResponseText => _snapshot.Nodes(_index).Value.UiResponseText;

        /// <summary>
        /// Whether this node has a condition method.
        /// </summary>
        public bool HasCondition => _snapshot.Nodes(_index).Value.HasCondition;

        /// <summary>
        /// Whether this node has an action method.
        /// </summary>
        public bool HasAction => _snapshot.Nodes(_index).Value.HasAction;

        /// <summary>
        /// Whether this node prevents showing response choices.
        /// </summary>
        public bool IsPreventResponse => _snapshot.Nodes(_index).Value.IsPreventResponse;

        /// <summary>
        /// The number of outgoing edges from this node.
        /// </summary>
        public int OutgoingEdgeCount => _snapshot.Nodes(_index).Value.OutgoingEdgeIndicesLength;

        /// <summary>
        /// Gets an outgoing edge by index.
        /// </summary>
        public EdgeRef GetOutgoingEdge(int i)
        {
            int edgeIdx = _snapshot.Nodes(_index).Value.OutgoingEdgeIndices(i);
            return new EdgeRef(_snapshot, edgeIdx);
        }

        /// <summary>
        /// The number of properties on this node.
        /// </summary>
        public int PropertyCount => _snapshot.Nodes(_index).Value.PropertiesLength;

        /// <summary>
        /// Gets a property by index.
        /// </summary>
        public NodeProperty GetProperty(int i)
        {
            return _snapshot.Nodes(_index).Value.Properties(i).Value;
        }

        /// <summary>
        /// The conversation this node belongs to.
        /// </summary>
        public ConversationRef Conversation
        {
            get
            {
                int convIdx = _snapshot.Nodes(_index).Value.ConversationIdx;
                return new ConversationRef(_snapshot, convIdx);
            }
        }
    }

    /// <summary>
    /// Lightweight wrapper around a FlatBuffers Conversation providing convenient property access.
    /// This is a struct holding a snapshot reference and index - zero allocation.
    /// </summary>
    public readonly struct ConversationRef
    {
        readonly Snapshot _snapshot;
        readonly int _index;

        internal ConversationRef(Snapshot snapshot, int index)
        {
            _snapshot = snapshot;
            _index = index;
        }

        /// <summary>
        /// The index of this conversation in the snapshot's Conversations array.
        /// </summary>
        public int Index => _index;

        /// <summary>
        /// The original database ID of this conversation.
        /// </summary>
        public int Id => _snapshot.Conversations(_index).Value.Id;

        /// <summary>
        /// The name of this conversation.
        /// </summary>
        public string Name => _snapshot.Conversations(_index).Value.Name;

        /// <summary>
        /// The root node of this conversation.
        /// </summary>
        public NodeRef RootNode
        {
            get
            {
                int rootIdx = _snapshot.Conversations(_index).Value.RootNodeIdx;
                return new NodeRef(_snapshot, rootIdx);
            }
        }

        /// <summary>
        /// The number of nodes in this conversation.
        /// </summary>
        public int NodeCount => _snapshot.Conversations(_index).Value.NodeIndicesLength;

        /// <summary>
        /// Gets a node by index within this conversation.
        /// </summary>
        public NodeRef GetNode(int i)
        {
            int nodeIdx = _snapshot.Conversations(_index).Value.NodeIndices(i);
            return new NodeRef(_snapshot, nodeIdx);
        }

        /// <summary>
        /// The number of edges in this conversation.
        /// </summary>
        public int EdgeCount => _snapshot.Conversations(_index).Value.EdgeIndicesLength;

        /// <summary>
        /// Gets an edge by index within this conversation.
        /// </summary>
        public EdgeRef GetEdge(int i)
        {
            int edgeIdx = _snapshot.Conversations(_index).Value.EdgeIndices(i);
            return new EdgeRef(_snapshot, edgeIdx);
        }
    }

    /// <summary>
    /// Lightweight wrapper around a FlatBuffers Actor providing convenient property access.
    /// This is a struct holding a snapshot reference and index - zero allocation.
    /// </summary>
    public readonly struct ActorRef
    {
        readonly Snapshot _snapshot;
        readonly int _index;

        internal ActorRef(Snapshot snapshot, int index)
        {
            _snapshot = snapshot;
            _index = index;
        }

        /// <summary>
        /// The index of this actor in the snapshot's Actors array.
        /// </summary>
        public int Index => _index;

        /// <summary>
        /// The original database ID of this actor.
        /// </summary>
        public int Id => _snapshot.Actors(_index).Value.Id;

        /// <summary>
        /// The internal name/identifier of this actor.
        /// </summary>
        public string Name => _snapshot.Actors(_index).Value.Name;

        /// <summary>
        /// The localized display name of this actor.
        /// </summary>
        public string LocalizedName => _snapshot.Actors(_index).Value.LocalizedName;

        /// <summary>
        /// The color of this actor (hex format, e.g., "#808080").
        /// </summary>
        public string Color => _snapshot.Actors(_index).Value.Color;
    }

    /// <summary>
    /// Lightweight wrapper around a FlatBuffers Edge providing convenient property access.
    /// This is a struct holding a snapshot reference and index - zero allocation.
    /// </summary>
    public readonly struct EdgeRef
    {
        readonly Snapshot _snapshot;
        readonly int _index;

        internal EdgeRef(Snapshot snapshot, int index)
        {
            _snapshot = snapshot;
            _index = index;
        }

        /// <summary>
        /// The index of this edge in the snapshot's Edges array.
        /// </summary>
        public int Index => _index;

        /// <summary>
        /// The original database ID of this edge.
        /// </summary>
        public int Id => _snapshot.Edges(_index).Value.Id;

        /// <summary>
        /// The source node of this edge.
        /// </summary>
        public NodeRef Source
        {
            get
            {
                int sourceIdx = _snapshot.Edges(_index).Value.SourceIdx;
                return new NodeRef(_snapshot, sourceIdx);
            }
        }

        /// <summary>
        /// The target node of this edge.
        /// </summary>
        public NodeRef Target
        {
            get
            {
                int targetIdx = _snapshot.Edges(_index).Value.TargetIdx;
                return new NodeRef(_snapshot, targetIdx);
            }
        }

        /// <summary>
        /// The priority of this edge (higher = preferred).
        /// </summary>
        public int Priority => _snapshot.Edges(_index).Value.Priority;
    }

    /// <summary>
    /// Lightweight wrapper around a FlatBuffers Localization providing convenient property access.
    /// This is a struct holding a snapshot reference and index - zero allocation.
    /// </summary>
    public readonly struct LocalizationRef
    {
        readonly Snapshot _snapshot;
        readonly int _index;

        internal LocalizationRef(Snapshot snapshot, int index)
        {
            _snapshot = snapshot;
            _index = index;
        }

        /// <summary>
        /// The index of this localization in the snapshot's Localizations array.
        /// </summary>
        public int Index => _index;

        /// <summary>
        /// The original database ID of this localization.
        /// </summary>
        public int Id => _snapshot.Localizations(_index).Value.Id;

        /// <summary>
        /// The key/name of this localization (e.g., "menu.start").
        /// </summary>
        public string Name => _snapshot.Localizations(_index).Value.Name;

        /// <summary>
        /// The localized text.
        /// </summary>
        public string Text => _snapshot.Localizations(_index).Value.Text;
    }
}
