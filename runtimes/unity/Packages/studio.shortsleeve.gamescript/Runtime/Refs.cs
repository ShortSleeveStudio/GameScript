namespace GameScript
{
    /// <summary>
    /// The type of a node property value.
    /// </summary>
    public enum NodePropertyType : sbyte
    {
        String = 0,
        Integer = 1,
        Decimal = 2,
        Boolean = 3,
    }

    /// <summary>
    /// Lightweight wrapper around a FlatSharp NodeProperty providing convenient property access.
    /// This is a struct holding a snapshot reference and the property data - zero allocation.
    /// </summary>
    public readonly struct NodePropertyRef
    {
        readonly Snapshot _snapshot;
        readonly NodeProperty _property;

        internal NodePropertyRef(Snapshot snapshot, NodeProperty property)
        {
            _snapshot = snapshot;
            _property = property;
        }

        /// <summary>
        /// The name of this property (from the property template).
        /// </summary>
        public string Name => _snapshot.PropertyTemplates[_property.TemplateIdx].Name;

        /// <summary>
        /// The type of this property's value.
        /// </summary>
        public NodePropertyType Type => (NodePropertyType)_snapshot.PropertyTemplates[_property.TemplateIdx].Type;

        /// <summary>
        /// Gets the string value. Throws if Type is not String.
        /// </summary>
        public string StringValue => _property.Value.Value.string_val;

        /// <summary>
        /// Gets the integer value. Throws if Type is not Integer.
        /// </summary>
        public int IntValue => _property.Value.Value.int_val.Value;

        /// <summary>
        /// Gets the decimal/float value. Throws if Type is not Decimal.
        /// </summary>
        public float FloatValue => _property.Value.Value.decimal_val.Value;

        /// <summary>
        /// Gets the boolean value. Throws if Type is not Boolean.
        /// </summary>
        public bool BoolValue => _property.Value.Value.bool_val.Value;

        /// <summary>
        /// Tries to get the string value.
        /// </summary>
        public bool TryGetString(out string value)
        {
            if (_property.Value.HasValue && _property.Value.Value.TryGet(out string str))
            {
                value = str!;
                return true;
            }
            value = null!;
            return false;
        }

        /// <summary>
        /// Tries to get the integer value.
        /// </summary>
        public bool TryGetInt(out int value)
        {
            if (_property.Value.HasValue && _property.Value.Value.TryGet(out Int32Value intVal))
            {
                value = intVal!.Value;
                return true;
            }
            value = default;
            return false;
        }

        /// <summary>
        /// Tries to get the decimal/float value.
        /// </summary>
        public bool TryGetFloat(out float value)
        {
            if (_property.Value.HasValue && _property.Value.Value.TryGet(out FloatValue floatVal))
            {
                value = floatVal!.Value;
                return true;
            }
            value = default;
            return false;
        }

        /// <summary>
        /// Tries to get the boolean value.
        /// </summary>
        public bool TryGetBool(out bool value)
        {
            if (_property.Value.HasValue && _property.Value.Value.TryGet(out BoolValue boolVal))
            {
                value = boolVal!.Value;
                return true;
            }
            value = default;
            return false;
        }
    }

    /// <summary>
    /// Lightweight wrapper around a FlatSharp ConversationProperty providing convenient property access.
    /// This is a struct holding a snapshot reference and the property data - zero allocation.
    /// </summary>
    public readonly struct ConversationPropertyRef
    {
        readonly Snapshot _snapshot;
        readonly ConversationProperty _property;

        internal ConversationPropertyRef(Snapshot snapshot, ConversationProperty property)
        {
            _snapshot = snapshot;
            _property = property;
        }

        /// <summary>
        /// The name of this property (from the property template).
        /// </summary>
        public string Name => _snapshot.PropertyTemplates[_property.TemplateIdx].Name;

        /// <summary>
        /// The type of this property's value.
        /// </summary>
        public NodePropertyType Type => (NodePropertyType)_snapshot.PropertyTemplates[_property.TemplateIdx].Type;

        /// <summary>
        /// Gets the string value. Throws if Type is not String.
        /// </summary>
        public string StringValue => _property.Value.Value.string_val;

        /// <summary>
        /// Gets the integer value. Throws if Type is not Integer.
        /// </summary>
        public int IntValue => _property.Value.Value.int_val.Value;

        /// <summary>
        /// Gets the decimal/float value. Throws if Type is not Decimal.
        /// </summary>
        public float FloatValue => _property.Value.Value.decimal_val.Value;

        /// <summary>
        /// Gets the boolean value. Throws if Type is not Boolean.
        /// </summary>
        public bool BoolValue => _property.Value.Value.bool_val.Value;

        /// <summary>
        /// Tries to get the string value.
        /// </summary>
        public bool TryGetString(out string value)
        {
            if (_property.Value.HasValue && _property.Value.Value.TryGet(out string str))
            {
                value = str!;
                return true;
            }
            value = null!;
            return false;
        }

        /// <summary>
        /// Tries to get the integer value.
        /// </summary>
        public bool TryGetInt(out int value)
        {
            if (_property.Value.HasValue && _property.Value.Value.TryGet(out Int32Value intVal))
            {
                value = intVal!.Value;
                return true;
            }
            value = default;
            return false;
        }

        /// <summary>
        /// Tries to get the decimal/float value.
        /// </summary>
        public bool TryGetFloat(out float value)
        {
            if (_property.Value.HasValue && _property.Value.Value.TryGet(out FloatValue floatVal))
            {
                value = floatVal!.Value;
                return true;
            }
            value = default;
            return false;
        }

        /// <summary>
        /// Tries to get the boolean value.
        /// </summary>
        public bool TryGetBool(out bool value)
        {
            if (_property.Value.HasValue && _property.Value.Value.TryGet(out BoolValue boolVal))
            {
                value = boolVal!.Value;
                return true;
            }
            value = default;
            return false;
        }
    }

    /// <summary>
    /// Lightweight wrapper around a FlatSharp Node providing convenient property access.
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
        public int Id => _snapshot.Nodes[_index].Id;

        /// <summary>
        /// The type of this node (Root, Dialogue, or Logic).
        /// </summary>
        public NodeType Type => _snapshot.Nodes[_index].Type;

        /// <summary>
        /// The actor for this node.
        /// </summary>
        public ActorRef Actor
        {
            get
            {
                int actorIdx = _snapshot.Nodes[_index].ActorIdx;
                return new ActorRef(_snapshot, actorIdx);
            }
        }

        /// <summary>
        /// Index into <c>snapshot.Localizations</c> for this node's voice text.
        /// Returns <c>-1</c> if this node has no voice text localization.
        /// </summary>
        public int VoiceTextLocalizationIdx => _snapshot.Nodes[_index].VoiceTextIdx;

        /// <summary>
        /// Index into <c>snapshot.Localizations</c> for this node's UI response text.
        /// Returns <c>-1</c> if this node has no UI response text localization.
        /// </summary>
        public int UIResponseTextLocalizationIdx => _snapshot.Nodes[_index].UiResponseTextIdx;

        /// <summary>
        /// Whether this node has a condition method.
        /// </summary>
        public bool HasCondition => _snapshot.Nodes[_index].HasCondition;

        /// <summary>
        /// Whether this node has an action method.
        /// </summary>
        public bool HasAction => _snapshot.Nodes[_index].HasAction;

        /// <summary>
        /// Whether this node prevents showing response choices.
        /// </summary>
        public bool IsPreventResponse => _snapshot.Nodes[_index].IsPreventResponse;

        /// <summary>
        /// The number of outgoing edges from this node.
        /// </summary>
        public int OutgoingEdgeCount => _snapshot.Nodes[_index].OutgoingEdgeIndices?.Count ?? 0;

        /// <summary>
        /// Gets an outgoing edge by index.
        /// </summary>
        public EdgeRef GetOutgoingEdge(int i)
        {
            int edgeIdx = _snapshot.Nodes[_index].OutgoingEdgeIndices[i];
            return new EdgeRef(_snapshot, edgeIdx);
        }

        /// <summary>
        /// The number of incoming edges to this node.
        /// </summary>
        public int IncomingEdgeCount => _snapshot.Nodes[_index].IncomingEdgeIndices?.Count ?? 0;

        /// <summary>
        /// Gets an incoming edge by index.
        /// </summary>
        public EdgeRef GetIncomingEdge(int i)
        {
            int edgeIdx = _snapshot.Nodes[_index].IncomingEdgeIndices[i];
            return new EdgeRef(_snapshot, edgeIdx);
        }

        /// <summary>
        /// The number of properties on this node.
        /// </summary>
        public int PropertyCount => _snapshot.Nodes[_index].Properties?.Count ?? 0;

        /// <summary>
        /// Gets a property by index.
        /// </summary>
        public NodePropertyRef GetProperty(int i)
        {
            return new NodePropertyRef(_snapshot, _snapshot.Nodes[_index].Properties[i]);
        }

        /// <summary>
        /// The conversation this node belongs to.
        /// </summary>
        public ConversationRef Conversation
        {
            get
            {
                int convIdx = _snapshot.Nodes[_index].ConversationIdx;
                return new ConversationRef(_snapshot, convIdx);
            }
        }

        // Resolves gender from snapshot without a dynamic-actor provider.
        // Dynamic grammatical gender falls back to GenderCategory.Other.
        internal static GenderCategory ResolveStaticGender(Localization loc, Snapshot snapshot)
        {
            int actorIdx = loc.SubjectActorIdx;
            if (actorIdx >= 0)
            {
                GrammaticalGender gg = snapshot.Actors[actorIdx].GrammaticalGender;
                switch (gg)
                {
                    case GrammaticalGender.Masculine: return GenderCategory.Masculine;
                    case GrammaticalGender.Feminine:  return GenderCategory.Feminine;
                    case GrammaticalGender.Neuter:    return GenderCategory.Neuter;
                    default:                          return GenderCategory.Other; // Other + Dynamic
                }
            }

            // Fall back to direct gender override (GenderCategory.Other when unset)
            return loc.SubjectGender;
        }
    }

    /// <summary>
    /// Lightweight wrapper around a FlatSharp Conversation providing convenient property access.
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
        public int Id => _snapshot.Conversations[_index].Id;

        /// <summary>
        /// The name of this conversation.
        /// </summary>
        public string Name => _snapshot.Conversations[_index].Name;

        /// <summary>
        /// The root node of this conversation.
        /// </summary>
        public NodeRef RootNode
        {
            get
            {
                int rootIdx = _snapshot.Conversations[_index].RootNodeIdx;
                return new NodeRef(_snapshot, rootIdx);
            }
        }

        /// <summary>
        /// The number of nodes in this conversation.
        /// </summary>
        public int NodeCount => _snapshot.Conversations[_index].NodeIndices?.Count ?? 0;

        /// <summary>
        /// Gets a node by index within this conversation.
        /// </summary>
        public NodeRef GetNode(int i)
        {
            int nodeIdx = _snapshot.Conversations[_index].NodeIndices[i];
            return new NodeRef(_snapshot, nodeIdx);
        }

        /// <summary>
        /// The number of edges in this conversation.
        /// </summary>
        public int EdgeCount => _snapshot.Conversations[_index].EdgeIndices?.Count ?? 0;

        /// <summary>
        /// Gets an edge by index within this conversation.
        /// </summary>
        public EdgeRef GetEdge(int i)
        {
            int edgeIdx = _snapshot.Conversations[_index].EdgeIndices[i];
            return new EdgeRef(_snapshot, edgeIdx);
        }

        /// <summary>
        /// The number of properties on this conversation.
        /// </summary>
        public int PropertyCount => _snapshot.Conversations[_index].Properties?.Count ?? 0;

        /// <summary>
        /// Gets a property by index.
        /// </summary>
        public ConversationPropertyRef GetProperty(int i)
        {
            return new ConversationPropertyRef(_snapshot, _snapshot.Conversations[_index].Properties[i]);
        }
    }

    /// <summary>
    /// Lightweight wrapper around a FlatSharp Actor providing convenient property access.
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
        public int Id => _snapshot.Actors[_index].Id;

        /// <summary>
        /// The internal name/identifier of this actor.
        /// </summary>
        public string Name => _snapshot.Actors[_index].Name;

        /// <summary>
        /// Index into <c>snapshot.Localizations</c> for this actor's display name.
        /// Pass to <see cref="LocalizationRef"/> and resolve with your preferred
        /// <see cref="TextResolutionParams"/> for a fully localised display name.
        /// Returns <c>-1</c> if this actor has no localized name.
        /// </summary>
        public int LocalizedNameIdx => _snapshot.Actors[_index].LocalizedNameIdx;

        /// <summary>
        /// The static-gender-resolved localized display name for this actor.
        /// Gender is resolved from the snapshot only (no template substitution).
        /// Returns <c>null</c> if this actor has no localized name.
        /// </summary>
        public string LocalizedName
        {
            get
            {
                int idx = _snapshot.Actors[_index].LocalizedNameIdx;
                if (idx < 0)
                    return null;
                return new LocalizationRef(_snapshot, idx).GetText();
            }
        }

        /// <summary>
        /// The grammatical gender of this actor.
        /// Used for automatic gender resolution when no explicit
        /// <see cref="TextResolutionParams.GenderOverride"/> is provided.
        /// </summary>
        public GrammaticalGender GrammaticalGender => _snapshot.Actors[_index].GrammaticalGender;

        /// <summary>
        /// The color of this actor (hex format, e.g., "#808080").
        /// </summary>
        public string Color => _snapshot.Actors[_index].Color;
    }

    /// <summary>
    /// Lightweight wrapper around a FlatSharp Edge providing convenient property access.
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
        public int Id => _snapshot.Edges[_index].Id;

        /// <summary>
        /// The source node of this edge.
        /// </summary>
        public NodeRef Source
        {
            get
            {
                int sourceIdx = _snapshot.Edges[_index].SourceIdx;
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
                int targetIdx = _snapshot.Edges[_index].TargetIdx;
                return new NodeRef(_snapshot, targetIdx);
            }
        }

        /// <summary>
        /// The priority of this edge (higher = preferred).
        /// </summary>
        public int Priority => _snapshot.Edges[_index].Priority;
    }

    /// <summary>
    /// Lightweight wrapper around a FlatSharp Localization providing convenient property access.
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
        public int Id => _snapshot.Localizations[_index].Id;

        /// <summary>
        /// The key/name of this localization (e.g., "menu.start").
        /// </summary>
        public string Name => _snapshot.Localizations[_index].Name;

        /// <summary>
        /// Index into <c>snapshot.Actors</c> for the subject actor of this localization.
        /// Returns <c>-1</c> if no subject actor is set.
        /// </summary>
        public int SubjectActorIdx => _snapshot.Localizations[_index].SubjectActorIdx;

        /// <summary>
        /// The direct gender override for this localization.
        /// Mutually exclusive with <see cref="SubjectActorIdx"/>. Returns <see cref="GenderCategory.Other"/> when unset.
        /// </summary>
        public GenderCategory SubjectGender => _snapshot.Localizations[_index].SubjectGender;

        /// <summary>
        /// Whether this localization uses <c>{placeholder}</c> syntax and requires template substitution.
        /// </summary>
        public bool IsTemplated => _snapshot.Localizations[_index].IsTemplated;

        /// <summary>
        /// The number of text variants in this localization entry.
        /// </summary>
        public int VariantCount => _snapshot.Localizations[_index].Variants?.Count ?? 0;

        /// <summary>
        /// Returns the static-gender-resolved text for this localization.
        /// Gender is resolved from the snapshot only (subject actor's grammatical gender or the
        /// localization's own gender override). Dynamic actors default to
        /// <see cref="GenderCategory.Other"/>. Plural defaults to
        /// <see cref="PluralCategory.Other"/>. No template substitution is performed.
        /// Returns <c>null</c> if there are no variants or all matched variants have null text.
        /// </summary>
        public string GetText()
        {
            Localization loc = _snapshot.Localizations[_index];
            GenderCategory gender = NodeRef.ResolveStaticGender(loc, _snapshot);
            return VariantResolver.Resolve(loc, gender, PluralCategory.Other);
        }
    }

    /// <summary>
    /// Lightweight wrapper around a ManifestLocale providing convenient property access.
    /// This is a struct holding a manifest reference and index - zero allocation.
    /// </summary>
    public readonly struct LocaleRef
    {
        readonly Manifest _manifest;
        readonly int _index;

        internal LocaleRef(Manifest manifest, int index)
        {
            _manifest = manifest;
            _index = index;
        }

        /// <summary>
        /// The index of this locale in the manifest's Locales array.
        /// </summary>
        public int Index => _index;

        /// <summary>
        /// The original database ID of this locale.
        /// </summary>
        public int Id => _manifest.Locales[_index].Id;

        /// <summary>
        /// The internal name/code of this locale (e.g., "en-US").
        /// </summary>
        public string Name => _manifest.Locales[_index].Name;

        /// <summary>
        /// The localized display name of this locale (e.g., "English (US)").
        /// </summary>
        public string LocalizedName => _manifest.Locales[_index].LocalizedName;

        /// <summary>
        /// The hash of the snapshot for this locale (used for hot-reload detection).
        /// </summary>
        internal string Hash => _manifest.Locales[_index].Hash;
    }

    /// <summary>
    /// Represents a candidate choice node presented to the player during a decision point.
    /// Wraps a snapshot node index together with the runner-resolved UI response text, so
    /// the listener never needs to call into the snapshot directly to render a choice button.
    /// </summary>
    public readonly struct ChoiceRef
    {
        readonly Snapshot _snapshot;
        readonly int _index;
        readonly string _resolvedUIResponseText;

        internal ChoiceRef(Snapshot snapshot, int index, string resolvedUIResponseText)
        {
            _snapshot = snapshot;
            _index = index;
            _resolvedUIResponseText = resolvedUIResponseText;
        }

        /// <summary>
        /// The index of the underlying node in the snapshot's Nodes array.
        /// </summary>
        public int Index => _index;

        /// <summary>
        /// The original database ID of the underlying node.
        /// </summary>
        public int Id => _snapshot.Nodes[_index].Id;

        /// <summary>
        /// The type of the underlying node.
        /// </summary>
        public NodeType Type => _snapshot.Nodes[_index].Type;

        /// <summary>
        /// The actor for the underlying node.
        /// </summary>
        public ActorRef Actor => new ActorRef(_snapshot, _snapshot.Nodes[_index].ActorIdx);

        /// <summary>
        /// The runner-resolved UI response text for this choice.
        /// Gender, plural, and template substitution have already been applied using the
        /// parameters returned from
        /// <see cref="IGameScriptListener.OnDecisionParams(LocalizationRef, NodeRef)"/>.
        /// Returns <c>null</c> if the underlying node has no UI response text.
        /// </summary>
        public string UIResponseText => _resolvedUIResponseText;

        /// <summary>
        /// Whether the underlying node has a condition method.
        /// </summary>
        public bool HasCondition => _snapshot.Nodes[_index].HasCondition;

        /// <summary>
        /// Whether the underlying node has an action method.
        /// </summary>
        public bool HasAction => _snapshot.Nodes[_index].HasAction;

        /// <summary>
        /// Whether the underlying node prevents showing response choices after it is selected.
        /// </summary>
        public bool IsPreventResponse => _snapshot.Nodes[_index].IsPreventResponse;

        /// <summary>
        /// The number of custom properties attached to the underlying node.
        /// </summary>
        public int PropertyCount => _snapshot.Nodes[_index].Properties?.Count ?? 0;

        /// <summary>
        /// Gets a custom property by index from the underlying node.
        /// </summary>
        public NodePropertyRef GetProperty(int i)
            => new NodePropertyRef(_snapshot, _snapshot.Nodes[_index].Properties[i]);

        /// <summary>
        /// Returns the underlying <see cref="NodeRef"/> for this choice.
        /// </summary>
        public NodeRef Node => new NodeRef(_snapshot, _index);
    }
}
