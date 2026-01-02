using System;
using System.Data;
using Mono.Data.Sqlite;
using UnityEngine;

namespace GameScript
{
    static class ImportHelpers
    {
        public static string GetProjectRelativePath(string original) =>
            original.Substring(Application.dataPath.Length - "Assets".Length);

        public static void ReadTable(
            SqliteConnection connection,
            string tableName,
            Action<uint> onCount,
            Action<uint, SqliteDataReader> onRow,
            string whereClause = ""
        )
        {
            // Fetch row count
            uint count = 0;
            using (SqliteCommand command = connection.CreateCommand())
            {
                command.CommandType = CommandType.Text;
                command.CommandText = $"SELECT COUNT(*) as count FROM {tableName} {whereClause};";
                using (SqliteDataReader reader = command.ExecuteReader())
                {
                    while (reader.Read())
                        count = (uint)reader.GetInt64(0);
                }
            }
            if (onCount != null)
                onCount(count);

            // Fetch all rows
            for (uint i = 0; i < count; i += EditorConstants.k_SqlBatchSize)
            {
                uint limit = EditorConstants.k_SqlBatchSize;
                uint offset = i;
                string query =
                    $"SELECT * FROM {tableName} {whereClause} "
                    + $"ORDER BY id ASC LIMIT {limit} OFFSET {offset};";
                uint j = 0;
                using (SqliteCommand command = connection.CreateCommand())
                {
                    command.CommandType = CommandType.Text;
                    command.CommandText = query;
                    using (SqliteDataReader reader = command.ExecuteReader())
                    {
                        while (reader.Read())
                            onRow(i + j++, reader);
                    }
                }
            }
        }
    }
}
