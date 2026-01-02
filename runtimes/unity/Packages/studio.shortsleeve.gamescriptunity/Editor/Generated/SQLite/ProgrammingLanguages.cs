// GENERATED CODE - DO NOT EDIT BY HAND

using System;
using Mono.Data.Sqlite;

namespace GameScript
{
    class ProgrammingLanguages
    {
        public const string TABLE_NAME = "programming_languages";
        public long id;
        public string name;

        public static ProgrammingLanguages FromReader(SqliteDataReader reader)
        {
            ProgrammingLanguages obj = new();
            obj.id = reader.GetValue(0) is DBNull
                ? 0
                : reader.GetInt64(0)
                ;
            obj.name = reader.GetValue(1) is DBNull
                ? string.Empty
                : reader.GetString(1)
                ;
            return obj;
        }
    }
}
