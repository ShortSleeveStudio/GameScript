using System;

namespace GameScript
{
    [Serializable]
    public class GameData
    {
        public Localization[] Localizations;
        public Locale[] Locales;
        public Actor[] Actors;
        public Conversation[] Conversations;
    }
}
