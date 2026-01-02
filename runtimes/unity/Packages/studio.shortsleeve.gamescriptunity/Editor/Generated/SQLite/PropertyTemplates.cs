// GENERATED CODE - DO NOT EDIT BY HAND

using System;
using Mono.Data.Sqlite;

namespace GameScript
{
    class PropertyTemplates
    {
        public const string TABLE_NAME = "property_templates";
        public long id;
        public string name;
        public long parent;
        public long type;

        public static PropertyTemplates FromReader(SqliteDataReader reader)
        {
            PropertyTemplates obj = new();
            obj.id = reader.GetValue(0) is DBNull
                ? 0
                : reader.GetInt64(0)
                ;
            obj.name = reader.GetValue(1) is DBNull
                ? string.Empty
                : reader.GetString(1)
                ;
            obj.parent = reader.GetValue(2) is DBNull
                ? 0
                : reader.GetInt64(2)
                ;
            obj.type = reader.GetValue(3) is DBNull
                ? 0
                : reader.GetInt64(3)
                ;
            return obj;
        }
    }
}
