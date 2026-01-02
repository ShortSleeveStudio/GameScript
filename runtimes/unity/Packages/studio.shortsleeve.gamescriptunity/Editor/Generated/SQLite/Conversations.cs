// GENERATED CODE - DO NOT EDIT BY HAND

using System;
using Mono.Data.Sqlite;

namespace GameScript
{
    class Conversations
    {
        public const string TABLE_NAME = "conversations";
        public long id;
        public string name;
        public bool is_system_created;
        public string notes;
        public bool is_deleted;
        public bool is_layout_auto;
        public bool is_layout_vertical;
        public string[] filters;

        public static Conversations FromReader(SqliteDataReader reader)
        {
            Conversations obj = new();
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
            obj.notes = reader.GetValue(3) is DBNull
                ? string.Empty
                : reader.GetString(3)
                ;
            obj.is_deleted = reader.GetValue(4) is DBNull
                ? false
                : reader.GetBoolean(4)
                ;
            obj.is_layout_auto = reader.GetValue(5) is DBNull
                ? false
                : reader.GetBoolean(5)
                ;
            obj.is_layout_vertical = reader.GetValue(6) is DBNull
                ? false
                : reader.GetBoolean(6)
                ;
            obj.filters = new string[reader.FieldCount - 7];
            for (int i = 0; i < obj.filters.Length; i++)
            {
                int valueIndex = 7 + i;
                obj.filters[i] = reader.GetValue(valueIndex) is DBNull ? string.Empty : reader.GetString(valueIndex);
            }
            return obj;
        }
    }
}
