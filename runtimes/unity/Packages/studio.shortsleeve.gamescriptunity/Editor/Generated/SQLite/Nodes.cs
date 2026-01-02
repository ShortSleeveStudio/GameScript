// GENERATED CODE - DO NOT EDIT BY HAND

using System;
using Mono.Data.Sqlite;

namespace GameScript
{
    class Nodes
    {
        public const string TABLE_NAME = "nodes";
        public long id;
        public long parent;
        public long actor;
        public long ui_response_text;
        public long voice_text;
        public long condition;
        public long code;
        public long code_override;
        public bool is_prevent_response;
        public string notes;
        public bool is_system_created;
        public string type;
        public double position_x;
        public double position_y;

        public static Nodes FromReader(SqliteDataReader reader)
        {
            Nodes obj = new();
            obj.id = reader.GetValue(0) is DBNull
                ? 0
                : reader.GetInt64(0)
                ;
            obj.parent = reader.GetValue(1) is DBNull
                ? 0
                : reader.GetInt64(1)
                ;
            obj.actor = reader.GetValue(2) is DBNull
                ? 0
                : reader.GetInt64(2)
                ;
            obj.ui_response_text = reader.GetValue(3) is DBNull
                ? 0
                : reader.GetInt64(3)
                ;
            obj.voice_text = reader.GetValue(4) is DBNull
                ? 0
                : reader.GetInt64(4)
                ;
            obj.condition = reader.GetValue(5) is DBNull
                ? 0
                : reader.GetInt64(5)
                ;
            obj.code = reader.GetValue(6) is DBNull
                ? 0
                : reader.GetInt64(6)
                ;
            obj.code_override = reader.GetValue(7) is DBNull
                ? 0
                : reader.GetInt64(7)
                ;
            obj.is_prevent_response = reader.GetValue(8) is DBNull
                ? false
                : reader.GetBoolean(8)
                ;
            obj.notes = reader.GetValue(9) is DBNull
                ? string.Empty
                : reader.GetString(9)
                ;
            obj.is_system_created = reader.GetValue(10) is DBNull
                ? false
                : reader.GetBoolean(10)
                ;
            obj.type = reader.GetValue(11) is DBNull
                ? string.Empty
                : reader.GetString(11)
                ;
            obj.position_x = reader.GetValue(12) is DBNull
                ? 0d
                : reader.GetDouble(12)
                ;
            obj.position_y = reader.GetValue(13) is DBNull
                ? 0d
                : reader.GetDouble(13)
                ;
            return obj;
        }
    }
}
