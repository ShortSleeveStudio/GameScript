using System;

namespace GameScript
{
    [Serializable]
    public class Locale : BaseData<Locale>
    {
        public uint Index; // Used to lookup localization
        public string Name;
        public Localization LocalizedName;
    }
}
