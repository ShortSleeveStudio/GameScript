using System;

namespace GameScript
{
    [Serializable]
    public class Localization : BaseData<Localization>
    {
        public string[] Localizations; // Lookup with Locale.Index

        public string GetLocalization(Locale locale) => Localizations[locale.Index];
    }
}
