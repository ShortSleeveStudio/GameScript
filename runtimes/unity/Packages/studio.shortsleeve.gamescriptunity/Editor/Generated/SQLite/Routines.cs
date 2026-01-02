// GENERATED CODE - DO NOT EDIT BY HAND

using System;
using Mono.Data.Sqlite;

namespace GameScript
{
    class Routines
    {
        public const string TABLE_NAME = "routines";
        public long id;
        public string name;
        public string code;
        public long type;
        public bool is_condition;
        public string notes;
        public bool is_system_created;
        public long parent;

        public static Routines FromReader(SqliteDataReader reader)
        {
            Routines obj = new();
            obj.id = reader.GetValue(0) is DBNull
                ? 0
                : reader.GetInt64(0)
                ;
            obj.name = reader.GetValue(1) is DBNull
                ? string.Empty
                : reader.GetString(1)
                ;
            obj.code = reader.GetValue(2) is DBNull
                ? string.Empty
                : reader.GetString(2)
                ;
            obj.type = reader.GetValue(3) is DBNull
                ? 0
                : reader.GetInt64(3)
                ;
            obj.is_condition = reader.GetValue(4) is DBNull
                ? false
                : reader.GetBoolean(4)
                ;
            obj.notes = reader.GetValue(5) is DBNull
                ? string.Empty
                : reader.GetString(5)
                ;
            obj.is_system_created = reader.GetValue(6) is DBNull
                ? false
                : reader.GetBoolean(6)
                ;
            obj.parent = reader.GetValue(7) is DBNull
                ? 0
                : reader.GetInt64(7)
                ;
            return obj;
        }
    }
}
