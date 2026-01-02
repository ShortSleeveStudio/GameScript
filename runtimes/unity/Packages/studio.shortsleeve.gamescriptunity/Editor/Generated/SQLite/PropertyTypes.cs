// GENERATED CODE - DO NOT EDIT BY HAND

using System;
using Mono.Data.Sqlite;

namespace GameScript
{
    class PropertyTypes
    {
        public const string TABLE_NAME = "property_types";
        public long id;
        public string name;

        public static PropertyTypes FromReader(SqliteDataReader reader)
        {
            PropertyTypes obj = new();
            obj.id = reader.GetValue(0) is DBNull
                ? 0
                : reader.GetInt64(0)
                ;
            obj.name = reader.GetValue(1) is DBNull
                ? string.Empty
                : reader.GetString(1)
                ;
            return obj;
        }
    }
}
