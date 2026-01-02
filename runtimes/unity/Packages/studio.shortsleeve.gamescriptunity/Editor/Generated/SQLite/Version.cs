// GENERATED CODE - DO NOT EDIT BY HAND

using System;
using Mono.Data.Sqlite;

namespace GameScript
{
    class Version
    {
        public const string TABLE_NAME = "version";
        public long id;
        public string version;

        public static Version FromReader(SqliteDataReader reader)
        {
            Version obj = new();
            obj.id = reader.GetValue(0) is DBNull
                ? 0
                : reader.GetInt64(0)
                ;
            obj.version = reader.GetValue(1) is DBNull
                ? string.Empty
                : reader.GetString(1)
                ;
            return obj;
        }
    }
}
