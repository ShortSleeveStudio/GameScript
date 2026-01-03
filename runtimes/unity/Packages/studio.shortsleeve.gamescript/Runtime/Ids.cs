using System;
using UnityEngine;

namespace GameScript
{
    /// <summary>
    /// Serializable wrapper for a conversation database ID.
    /// Use in Inspector fields to get a searchable picker with tag filters.
    /// Database IDs start at 1, so 0 means "not set" (works with default struct initialization).
    /// </summary>
    [Serializable]
    public struct ConversationId : IEquatable<ConversationId>
    {
        public static readonly ConversationId None = default;

        [SerializeField] internal int value;

        public ConversationId(int id) => value = id;

        public bool IsValid => value > 0;

        public static implicit operator int(ConversationId id) => id.value;
        public static explicit operator ConversationId(int id) => new(id);

        public bool Equals(ConversationId other) => value == other.value;
        public override bool Equals(object obj) => obj is ConversationId other && Equals(other);
        public override int GetHashCode() => value;
        public override string ToString() => value.ToString();

        public static bool operator ==(ConversationId left, ConversationId right) => left.value == right.value;
        public static bool operator !=(ConversationId left, ConversationId right) => left.value != right.value;
    }

    /// <summary>
    /// Serializable wrapper for a localization database ID.
    /// Use in Inspector fields to get a searchable picker with tag filters.
    /// Database IDs start at 1, so 0 means "not set" (works with default struct initialization).
    /// </summary>
    [Serializable]
    public struct LocalizationId : IEquatable<LocalizationId>
    {
        public static readonly LocalizationId None = default;

        [SerializeField] internal int value;

        public LocalizationId(int id) => value = id;

        public bool IsValid => value > 0;

        public static implicit operator int(LocalizationId id) => id.value;
        public static explicit operator LocalizationId(int id) => new(id);

        public bool Equals(LocalizationId other) => value == other.value;
        public override bool Equals(object obj) => obj is LocalizationId other && Equals(other);
        public override int GetHashCode() => value;
        public override string ToString() => value.ToString();

        public static bool operator ==(LocalizationId left, LocalizationId right) => left.value == right.value;
        public static bool operator !=(LocalizationId left, LocalizationId right) => left.value != right.value;
    }

    /// <summary>
    /// Serializable wrapper for an actor database ID.
    /// Use in Inspector fields to get a searchable picker.
    /// Database IDs start at 1, so 0 means "not set" (works with default struct initialization).
    /// </summary>
    [Serializable]
    public struct ActorId : IEquatable<ActorId>
    {
        public static readonly ActorId None = default;

        [SerializeField] internal int value;

        public ActorId(int id) => value = id;

        public bool IsValid => value > 0;

        public static implicit operator int(ActorId id) => id.value;
        public static explicit operator ActorId(int id) => new(id);

        public bool Equals(ActorId other) => value == other.value;
        public override bool Equals(object obj) => obj is ActorId other && Equals(other);
        public override int GetHashCode() => value;
        public override string ToString() => value.ToString();

        public static bool operator ==(ActorId left, ActorId right) => left.value == right.value;
        public static bool operator !=(ActorId left, ActorId right) => left.value != right.value;
    }

    /// <summary>
    /// Serializable wrapper for a locale database ID.
    /// Use in Inspector fields to get a searchable picker.
    /// Database IDs start at 1, so 0 means "not set" (works with default struct initialization).
    /// </summary>
    [Serializable]
    public struct LocaleId : IEquatable<LocaleId>
    {
        public static readonly LocaleId None = default;

        [SerializeField] internal int value;

        public LocaleId(int id) => value = id;

        public bool IsValid => value > 0;

        public static implicit operator int(LocaleId id) => id.value;
        public static explicit operator LocaleId(int id) => new(id);

        public bool Equals(LocaleId other) => value == other.value;
        public override bool Equals(object obj) => obj is LocaleId other && Equals(other);
        public override int GetHashCode() => value;
        public override string ToString() => value.ToString();

        public static bool operator ==(LocaleId left, LocaleId right) => left.value == right.value;
        public static bool operator !=(LocaleId left, LocaleId right) => left.value != right.value;
    }
}
