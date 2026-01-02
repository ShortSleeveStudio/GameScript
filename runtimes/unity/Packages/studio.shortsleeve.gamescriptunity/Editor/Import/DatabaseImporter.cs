using System;
using System.Data;
using System.Threading.Tasks;
using Mono.Data.Sqlite;
using UnityEditor;
using UnityEngine;

namespace GameScript
{
    static class DatabaseImporter
    {
        #region Variables
        public static bool IsImporting { get; private set; } = false;
        #endregion

        #region API
        public static string GetDatabaseVersion(string sqliteDatabasePath)
        {
            using (SqliteConnection connection = new(DbHelper.SqlitePathToURI(sqliteDatabasePath)))
            {
                // Open connection
                connection.Open();

                // Fetch table names
                using (SqliteCommand command = connection.CreateCommand())
                {
                    command.CommandType = CommandType.Text;
                    command.CommandText = $"SELECT version FROM {Version.TABLE_NAME};";
                    using (SqliteDataReader reader = command.ExecuteReader())
                    {
                        while (reader.Read())
                            return reader.GetString(0);
                    }
                }
            }
            return null;
        }

        public static async void ImportDatabase(
            string sqliteDatabasePath,
            string routineOutputDirectory,
            string conversationOutputDirectory
        )
        {
            try
            {
                if (IsImporting)
                    return;
                IsImporting = true;

                TranspilerResult transpilerResult = default;
                ConversationDataGeneratorResult conversationResult = default;
                ReferenceGeneratorResult assetResult = default;
                await Task.Run(() =>
                {
                    transpilerResult = Transpiler.Transpile(
                        sqliteDatabasePath,
                        routineOutputDirectory
                    );
                    if (transpilerResult.WasError)
                        return;
                    conversationResult = ConversationDataGenerator.GenerateConversationData(
                        sqliteDatabasePath,
                        conversationOutputDirectory,
                        transpilerResult.RoutineIdToIndex
                    );
                });

                // Check for errors
                if (transpilerResult.WasError || conversationResult.WasError)
                    return;

                // Create asset references (must be main thread)
                assetResult = ReferenceGenerator.GenerateAssetReferences(
                    sqliteDatabasePath,
                    routineOutputDirectory
                );
                if (assetResult.WasError)
                    return;

                // Update Settings
                Settings.GetSettings().MaxFlags = transpilerResult.MaxFlags;

                // Refresh Database
                AssetDatabase.Refresh();
            }
            catch (Exception e)
            {
                Debug.LogException(e);
            }
            finally
            {
                IsImporting = false;
            }
        }
        #endregion
    }
}
