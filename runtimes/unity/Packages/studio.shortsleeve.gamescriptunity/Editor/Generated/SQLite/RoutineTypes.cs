// GENERATED CODE - DO NOT EDIT BY HAND

using System;
using Mono.Data.Sqlite;

namespace GameScript
{
    class RoutineTypes
    {
        public const string TABLE_NAME = "routine_types";
        public long id;
        public string name;

        public static RoutineTypes FromReader(SqliteDataReader reader)
        {
            RoutineTypes obj = new();
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
