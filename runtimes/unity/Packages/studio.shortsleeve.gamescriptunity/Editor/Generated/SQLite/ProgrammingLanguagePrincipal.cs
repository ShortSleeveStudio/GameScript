// GENERATED CODE - DO NOT EDIT BY HAND

using System;
using Mono.Data.Sqlite;

namespace GameScript
{
    class ProgrammingLanguagePrincipal
    {
        public const string TABLE_NAME = "programming_language_principal";
        public long id;
        public long principal;

        public static ProgrammingLanguagePrincipal FromReader(SqliteDataReader reader)
        {
            ProgrammingLanguagePrincipal obj = new();
            obj.id = reader.GetValue(0) is DBNull
                ? 0
                : reader.GetInt64(0)
                ;
            obj.principal = reader.GetValue(1) is DBNull
                ? 0
                : reader.GetInt64(1)
                ;
            return obj;
        }
    }
}
