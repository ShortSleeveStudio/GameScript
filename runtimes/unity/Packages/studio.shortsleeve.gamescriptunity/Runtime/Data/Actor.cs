using System;

namespace GameScript
{
    [Serializable]
    public class Actor : BaseData<Actor>
    {
        public string Name;
        public Localization LocalizedName;
    }
}
