// GENERATED CODE - DO NOT EDIT BY HAND

using System;
using Mono.Data.Sqlite;

namespace GameScript
{
    class Locales
    {
        public const string TABLE_NAME = "locales";
        public long id;
        public string name;
        public bool is_system_created;
        public long localized_name;

        public static Locales FromReader(SqliteDataReader reader)
        {
            Locales obj = new();
            obj.id = reader.GetValue(0) is DBNull
                ? 0
                : reader.GetInt64(0)
                ;
            obj.name = reader.GetValue(1) is DBNull
                ? string.Empty
                : reader.GetString(1)
                ;
            obj.is_system_created = reader.GetValue(2) is DBNull
                ? false
                : reader.GetBoolean(2)
                ;
            obj.localized_name = reader.GetValue(3) is DBNull
                ? 0
                : reader.GetInt64(3)
                ;
            return obj;
        }
    }
}
