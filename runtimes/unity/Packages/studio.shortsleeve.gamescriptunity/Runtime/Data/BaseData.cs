using System;

namespace GameScript
{
    [Serializable]
    public abstract class BaseData<T> : IComparable<T>
        where T : BaseData<T>
    {
        public uint Id;

        public int CompareTo(T other) => Id.CompareTo(other.Id);
    }
}
