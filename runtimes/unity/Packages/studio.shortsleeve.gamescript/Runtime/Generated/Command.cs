using System;

namespace GameScript
{
    /// <summary>
    /// Entity type constants for command files.
    /// </summary>
    public static class EntityType
    {
        public const string Conversation = "conversation";
        public const string Actor = "actor";
        public const string Localization = "localization";
        public const string Locale = "locale";
    }

    /// <summary>
    /// Represents a command written to command.tmp for IPC with GameScript.
    /// Uses .tmp extension so Unity ignores it (no .meta file generated).
    /// </summary>
    [Serializable]
    public sealed class Command
    {
        public const string Filename = "command.tmp";

        public string action = string.Empty;
        public string type = string.Empty;
        public int id;

        public string Action => action;
        public string Type => type;
        public int Id => id;
    }

    /// <summary>
    /// Action constants for command files.
    /// </summary>
    public static class CommandAction
    {
        public const string Navigate = "navigate";
    }
}
