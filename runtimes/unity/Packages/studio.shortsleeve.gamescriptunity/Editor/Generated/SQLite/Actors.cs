// GENERATED CODE - DO NOT EDIT BY HAND

using System;
using Mono.Data.Sqlite;

namespace GameScript
{
    class Actors
    {
        public const string TABLE_NAME = "actors";
        public long id;
        public string name;
        public string color;
        public long localized_name;
        public bool is_system_created;

        public static Actors FromReader(SqliteDataReader reader)
        {
            Actors obj = new();
            obj.id = reader.GetValue(0) is DBNull
                ? 0
                : reader.GetInt64(0)
                ;
            obj.name = reader.GetValue(1) is DBNull
                ? string.Empty
                : reader.GetString(1)
                ;
            obj.color = reader.GetValue(2) is DBNull
                ? string.Empty
                : reader.GetString(2)
                ;
            obj.localized_name = reader.GetValue(3) is DBNull
                ? 0
                : reader.GetInt64(3)
                ;
            obj.is_system_created = reader.GetValue(4) is DBNull
                ? false
                : reader.GetBoolean(4)
                ;
            return obj;
        }
    }
}
