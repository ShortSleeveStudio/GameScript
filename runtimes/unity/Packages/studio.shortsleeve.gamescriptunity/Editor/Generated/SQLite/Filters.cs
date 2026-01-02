// GENERATED CODE - DO NOT EDIT BY HAND

using System;
using Mono.Data.Sqlite;

namespace GameScript
{
    class Filters
    {
        public const string TABLE_NAME = "filters";
        public long id;
        public string name;
        public string notes;

        public static Filters FromReader(SqliteDataReader reader)
        {
            Filters obj = new();
            obj.id = reader.GetValue(0) is DBNull
                ? 0
                : reader.GetInt64(0)
                ;
            obj.name = reader.GetValue(1) is DBNull
                ? string.Empty
                : reader.GetString(1)
                ;
            obj.notes = reader.GetValue(2) is DBNull
                ? string.Empty
                : reader.GetString(2)
                ;
            return obj;
        }
    }
}
