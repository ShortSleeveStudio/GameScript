// GENERATED CODE - DO NOT EDIT BY HAND

using System;
using Mono.Data.Sqlite;

namespace GameScript
{
    class AutoCompletes
    {
        public const string TABLE_NAME = "auto_completes";
        public long id;
        public string name;
        public long icon;
        public long rule;
        public string insertion;
        public string documentation;

        public static AutoCompletes FromReader(SqliteDataReader reader)
        {
            AutoCompletes obj = new();
            obj.id = reader.GetValue(0) is DBNull
                ? 0
                : reader.GetInt64(0)
                ;
            obj.name = reader.GetValue(1) is DBNull
                ? string.Empty
                : reader.GetString(1)
                ;
            obj.icon = reader.GetValue(2) is DBNull
                ? 0
                : reader.GetInt64(2)
                ;
            obj.rule = reader.GetValue(3) is DBNull
                ? 0
                : reader.GetInt64(3)
                ;
            obj.insertion = reader.GetValue(4) is DBNull
                ? string.Empty
                : reader.GetString(4)
                ;
            obj.documentation = reader.GetValue(5) is DBNull
                ? string.Empty
                : reader.GetString(5)
                ;
            return obj;
        }
    }
}
