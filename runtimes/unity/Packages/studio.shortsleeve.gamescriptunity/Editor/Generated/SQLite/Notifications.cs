// GENERATED CODE - DO NOT EDIT BY HAND

using System;
using Mono.Data.Sqlite;

namespace GameScript
{
    class Notifications
    {
        public const string TABLE_NAME = "notifications";
        public long id;
        public long timestamp;
        public long table_id;
        public long operation_id;
        public string json_payload;

        public static Notifications FromReader(SqliteDataReader reader)
        {
            Notifications obj = new();
            obj.id = reader.GetValue(0) is DBNull
                ? 0
                : reader.GetInt64(0)
                ;
            obj.timestamp = reader.GetValue(1) is DBNull
                ? 0
                : reader.GetInt64(1)
                ;
            obj.table_id = reader.GetValue(2) is DBNull
                ? 0
                : reader.GetInt64(2)
                ;
            obj.operation_id = reader.GetValue(3) is DBNull
                ? 0
                : reader.GetInt64(3)
                ;
            obj.json_payload = reader.GetValue(4) is DBNull
                ? string.Empty
                : reader.GetString(4)
                ;
            return obj;
        }
    }
}
