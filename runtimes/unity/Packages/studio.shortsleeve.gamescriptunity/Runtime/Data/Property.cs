using System;
using UnityEngine;

namespace GameScript
{
    [Serializable]
    public abstract class Property : IComparable<Property>
    {
        public string Name { get; private set; }

        public Property(string name) => Name = name;

        internal void SetName(string name) => Name = name;

        public int CompareTo(Property other) => Name.CompareTo(other.Name);
    }

    [Serializable]
    public class EmptyProperty : Property
    {
        public EmptyProperty(string name)
            : base(name) { }
    }

    [Serializable]
    public class StringProperty : Property
    {
        private string m_Value;

        public StringProperty(string name, string value)
            : base(name) => m_Value = value;

        public string GetString() => m_Value;
    }

    [Serializable]
    public class IntegerProperty : Property
    {
        private int m_Value;

        public IntegerProperty(string name, int value)
            : base(name) => m_Value = value;

        public int GetInteger() => m_Value;
    }

    [Serializable]
    public class DecimalProperty : Property
    {
        private float m_Value;

        public DecimalProperty(string name, float value)
            : base(name) => m_Value = value;

        public float GetDecimal() => m_Value;
    }

    [Serializable]
    public class BooleanProperty : Property
    {
        private bool m_Value;

        public BooleanProperty(string name, bool value)
            : base(name) => m_Value = value;

        public bool GetBoolean() => m_Value;
    }
}
