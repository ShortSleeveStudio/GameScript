// GENERATED CODE - DO NOT EDIT BY HAND

using System;
using Mono.Data.Sqlite;

namespace GameScript
{
    class NodeProperties
    {
        public const string TABLE_NAME = "node_properties";
        public long id;
        public long parent;
        public long template;
        public string value_string;
        public long value_integer;
        public double value_decimal;
        public bool value_boolean;

        public static NodeProperties FromReader(SqliteDataReader reader)
        {
            NodeProperties obj = new();
            obj.id = reader.GetValue(0) is DBNull
                ? 0
                : reader.GetInt64(0)
                ;
            obj.parent = reader.GetValue(1) is DBNull
                ? 0
                : reader.GetInt64(1)
                ;
            obj.template = reader.GetValue(2) is DBNull
                ? 0
                : reader.GetInt64(2)
                ;
            obj.value_string = reader.GetValue(3) is DBNull
                ? string.Empty
                : reader.GetString(3)
                ;
            obj.value_integer = reader.GetValue(4) is DBNull
                ? 0
                : reader.GetInt64(4)
                ;
            obj.value_decimal = reader.GetValue(5) is DBNull
                ? 0d
                : reader.GetDouble(5)
                ;
            obj.value_boolean = reader.GetValue(6) is DBNull
                ? false
                : reader.GetBoolean(6)
                ;
            return obj;
        }
    }
}
