// GENERATED CODE - DO NOT EDIT BY HAND

using System;
using Mono.Data.Sqlite;

namespace GameScript
{
    class Edges
    {
        public const string TABLE_NAME = "edges";
        public long id;
        public long parent;
        public long priority;
        public string notes;
        public string type;
        public long source;
        public long target;

        public static Edges FromReader(SqliteDataReader reader)
        {
            Edges obj = new();
            obj.id = reader.GetValue(0) is DBNull
                ? 0
                : reader.GetInt64(0)
                ;
            obj.parent = reader.GetValue(1) is DBNull
                ? 0
                : reader.GetInt64(1)
                ;
            obj.priority = reader.GetValue(2) is DBNull
                ? 0
                : reader.GetInt64(2)
                ;
            obj.notes = reader.GetValue(3) is DBNull
                ? string.Empty
                : reader.GetString(3)
                ;
            obj.type = reader.GetValue(4) is DBNull
                ? string.Empty
                : reader.GetString(4)
                ;
            obj.source = reader.GetValue(5) is DBNull
                ? 0
                : reader.GetInt64(5)
                ;
            obj.target = reader.GetValue(6) is DBNull
                ? 0
                : reader.GetInt64(6)
                ;
            return obj;
        }
    }
}
