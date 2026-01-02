namespace GameScript
{
    static class EditorConstants
    {
        public const int k_SqlBatchSize = 500;
        public const string k_TablesTableName = "tables";
        public const string k_PropertiesTableName = "node_properties";
        public const string k_RoutineTypesTableName = "routine_types";
        public const string k_PropertyTypesTableName = "property_types";
        public const string k_PropertyTemplateTableName = "property_templates";
        public const string k_GeneratedCodeWarning = "GENERATED CODE - DO NOT EDIT BY HAND";
        public const string k_ContextClass = "RunnerContext";
        public const string k_RoutineDirectoryClass = "RoutineDirectory";
        public const string k_RoutineInitializerClass = "RoutineInitializer";
        public const string k_RoutineFlagEnum = "RoutineFlag";
        public const string k_ActorEnum = "Cast";
        public const string k_LocaleFieldPrefix = "locale_";
        public const string k_FilterFieldPrefix = "filter_";
        public const string k_LocalizationReferenceFolderSuffix = "_localizations";
        public const string k_LocalizationGlobalFolder = "global_localizations";
        public const string k_ReferencesFolder = "References";
        public const string k_ReferencesOldFolder = "_OLD";
        public const string k_ReferencesTmpFolder = "_TEMPORARY";
        public const string k_ReferencesConversationsFolder = "Conversations";
        public const string k_ReferencesActorsFolder = "Actors";
        public const string k_ReferencesLocalesFolder = "Locales";
        public const uint k_NoopRoutineCodeId = uint.MaxValue;
        public const uint k_NoopRoutineConditionId = uint.MaxValue - 1;
    }
}
