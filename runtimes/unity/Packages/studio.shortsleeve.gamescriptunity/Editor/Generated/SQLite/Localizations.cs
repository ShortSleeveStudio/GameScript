// GENERATED CODE - DO NOT EDIT BY HAND

using System;
using Mono.Data.Sqlite;

namespace GameScript
{
    class Localizations
    {
        public const string TABLE_NAME = "localizations";
        public long id;
        public string name;
        public long parent;
        public bool is_system_created;
        public string[] localizations;

        public static Localizations FromReader(SqliteDataReader reader)
        {
            Localizations obj = new();
            obj.id = reader.GetValue(0) is DBNull
                ? 0
                : reader.GetInt64(0)
                ;
            obj.name = reader.GetValue(1) is DBNull
                ? string.Empty
                : reader.GetString(1)
                ;
            obj.parent = reader.GetValue(2) is DBNull
                ? 0
                : reader.GetInt64(2)
                ;
            obj.is_system_created = reader.GetValue(3) is DBNull
                ? false
                : reader.GetBoolean(3)
                ;
            obj.localizations = new string[reader.FieldCount - 4];
            for (int i = 0; i < obj.localizations.Length; i++)
            {
                int valueIndex = 4 + i;
                obj.localizations[i] = reader.GetValue(valueIndex) is DBNull ? string.Empty : reader.GetString(valueIndex);
            }
            return obj;
        }
    }
}
