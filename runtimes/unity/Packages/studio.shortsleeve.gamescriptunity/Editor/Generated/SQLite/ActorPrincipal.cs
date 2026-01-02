// GENERATED CODE - DO NOT EDIT BY HAND

using System;
using Mono.Data.Sqlite;

namespace GameScript
{
    class ActorPrincipal
    {
        public const string TABLE_NAME = "actor_principal";
        public long id;
        public long principal;

        public static ActorPrincipal FromReader(SqliteDataReader reader)
        {
            ActorPrincipal obj = new();
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
