using System;
using System.Collections.Generic;
using System.Data;
using System.IO;
using System.Linq;
using Mono.Data.Sqlite;
using UnityEditor;
using UnityEngine;
using static GameScript.StringWriter;

namespace GameScript
{
    static class DatabaseCodeGenerator
    {
        public static DbCodeGeneratorResult GenerateDatabaseCode(
            string sqliteDatabasePath,
            string dbCodeDirectory
        )
        {
            int progressId = 0;
            DbCodeGeneratorResult result = new();
            try
            {
                // Start Progress
                progressId = Progress.Start($"Importing {RuntimeConstants.k_AppName} database");

                // Delete old files
                if (Directory.Exists(dbCodeDirectory))
                    Directory.Delete(dbCodeDirectory, true);
                Directory.CreateDirectory(dbCodeDirectory);

                // Connect to database
                bool foundRoutineTypes = false;
                bool foundPropertyTypes = false;
                List<string> tableNames = new();
                Dictionary<string, List<DatabaseColumn>> tableToColumns = new();
                using (
                    SqliteConnection connection = new(DbHelper.SqlitePathToURI(sqliteDatabasePath))
                )
                {
                    // Open connection
                    connection.Open();

                    // Fetch table names
                    using (SqliteCommand command = connection.CreateCommand())
                    {
                        command.CommandType = CommandType.Text;
                        command.CommandText = "SELECT name FROM sqlite_master WHERE type='table';";
                        using (SqliteDataReader reader = command.ExecuteReader())
                        {
                            while (reader.Read())
                            {
                                string tableName = reader.GetString(0);
                                if (tableName != "sqlite_sequence")
                                    tableNames.Add(tableName);
                            }
                        }
                    }

                    // Fetch table schema
                    Progress.Report(progressId, 0.33f, "Loading column types");
                    for (int i = 0; i < tableNames.Count; i++)
                    {
                        string tableName = tableNames[i];
                        switch (tableName)
                        {
                            case EditorConstants.k_RoutineTypesTableName:
                            {
                                foundRoutineTypes = true;
                                GenerateEnumFile(
                                    FetchEnumTableData(connection, tableName),
                                    dbCodeDirectory,
                                    "RoutineType"
                                );
                                break;
                            }
                            case EditorConstants.k_PropertyTypesTableName:
                            {
                                foundPropertyTypes = true;
                                GenerateEnumFile(
                                    FetchEnumTableData(connection, tableName),
                                    dbCodeDirectory,
                                    "PropertyType"
                                );
                                break;
                            }
                            case EditorConstants.k_TablesTableName:
                                GenerateEnumFile(
                                    FetchEnumTableData(connection, tableName),
                                    dbCodeDirectory,
                                    "Table"
                                );
                                break;
                        }

                        // Generate type
                        using (SqliteCommand command = connection.CreateCommand())
                        {
                            // Add to map
                            List<DatabaseColumn> columns = new();
                            tableToColumns.Add(tableName, columns);

                            // Lookup columns
                            command.CommandType = CommandType.Text;
                            command.CommandText = $"pragma table_info({tableName});";
                            using (SqliteDataReader reader = command.ExecuteReader())
                            {
                                while (reader.Read())
                                {
                                    // Column name
                                    string columnName = reader.GetString(1);
                                    // TODO: make this less hacky
                                    bool isBool =
                                        columnName.StartsWith("is")
                                        || columnName.EndsWith("_boolean");
                                    string columnType = reader.GetString(2);
                                    DatabaseType type;
                                    switch (columnType)
                                    {
                                        case "INTEGER":
                                            type = isBool
                                                ? DatabaseType.BOOLEAN
                                                : DatabaseType.INTEGER;
                                            break;
                                        case "TEXT":
                                            type = DatabaseType.TEXT;
                                            break;
                                        case "NUMERIC":
                                            type = DatabaseType.DECIMAL;
                                            break;
                                        default:
                                            throw new Exception(
                                                "Encountered unknown database type: " + columnType
                                            );
                                    }
                                    columns.Add(
                                        new DatabaseColumn() { name = columnName, type = type, }
                                    );
                                }
                            }
                        }
                    }
                }

                // Ensure routine/property types were found/generated
                if (!foundRoutineTypes)
                    throw new Exception("Could not find routine types table");
                if (!foundPropertyTypes)
                    throw new Exception("Could not find property types table");

                // Generate types
                Progress.Report(progressId, 0.66f, "Generating type files");
                GenerateTypes(tableToColumns, dbCodeDirectory);
                Progress.Report(progressId, 1f, "Done");
            }
            catch (Exception e)
            {
                Debug.LogException(e);
                result.WasError = true;
            }
            finally
            {
                Progress.Remove(progressId);
            }
            return result;
        }

        static List<TypeData> FetchEnumTableData(SqliteConnection connection, string tableName)
        {
            List<TypeData> typeData = new();
            using (SqliteCommand command = connection.CreateCommand())
            {
                command.CommandType = CommandType.Text;
                command.CommandText = $"SELECT id, name FROM {tableName};";
                using (SqliteDataReader reader = command.ExecuteReader())
                {
                    while (reader.Read())
                    {
                        int typeId = reader.GetInt32(0);
                        string typeName = reader.GetString(1);
                        typeData.Add(new TypeData() { id = typeId, name = typeName, });
                    }
                }
            }
            return typeData;
        }

        static void GenerateEnumFile(
            List<TypeData> typeData,
            string dbCodeDirectory,
            string enumName
        )
        {
            using (
                StreamWriter writer = new StreamWriter(
                    Path.Combine(dbCodeDirectory, $"{enumName}.cs")
                )
            )
            {
                WriteLine(writer, 0, $"// {EditorConstants.k_GeneratedCodeWarning}");
                WriteLine(writer, 0, "");
                WriteLine(writer, 0, $"namespace {RuntimeConstants.k_AppName}");
                WriteLine(writer, 0, "{");
                WriteLine(writer, 1, $"public enum {enumName}");
                WriteLine(writer, 1, "{");
                for (int i = 0; i < typeData.Count; i++)
                {
                    TypeData data = typeData[i];
                    WriteLine(writer, 2, $"{PascalCase(data.name)} = {data.id},");
                }
                WriteLine(writer, 1, "}");
                WriteLine(writer, 0, "}");
            }
        }

        static void GenerateTypes(
            Dictionary<string, List<DatabaseColumn>> tableToColumns,
            string outputDirectory
        )
        {
            // Generate new files
            foreach (KeyValuePair<string, List<DatabaseColumn>> entry in tableToColumns)
            {
                string tableName = entry.Key;
                string friendlyTableName = PascalCase(tableName);
                List<DatabaseColumn> columns = entry.Value;
                using (
                    StreamWriter writer = new StreamWriter(
                        Path.Combine(outputDirectory, $"{friendlyTableName}.cs")
                    )
                )
                {
                    WriteLine(writer, 0, "// GENERATED CODE - DO NOT EDIT BY HAND");
                    WriteLine(writer, 0, "");
                    WriteLine(writer, 0, "using System;");
                    WriteLine(writer, 0, "using Mono.Data.Sqlite;");
                    WriteLine(writer, 0, "");
                    WriteLine(writer, 0, $"namespace {RuntimeConstants.k_AppName}");
                    WriteLine(writer, 0, "{");
                    WriteLine(writer, 1, $"class {friendlyTableName}");
                    WriteLine(writer, 1, "{");
                    // Table Name
                    WriteLine(writer, 2, $"public const string TABLE_NAME = \"{tableName}\";");
                    // Fields
                    for (int i = 0; i < columns.Count; i++)
                    {
                        DatabaseColumn column = columns[i];
                        if (
                            (
                                tableName == "conversations"
                                && column.name.StartsWith(EditorConstants.k_FilterFieldPrefix)
                            )
                            || (
                                tableName == "localizations"
                                && column.name.StartsWith(EditorConstants.k_LocaleFieldPrefix)
                            )
                        )
                            break;
                        else
                        {
                            string columnType = DatabaseTypeToTypeString(column.type);
                            WriteLine(writer, 2, $"public {columnType} {column.name};");
                        }
                    }
                    if (tableName == "conversations")
                        WriteLine(writer, 2, $"public string[] filters;");
                    else if (tableName == "localizations")
                        WriteLine(writer, 2, $"public string[] localizations;");

                    WriteLine(writer, 0, "");
                    // Deserializer
                    WriteLine(
                        writer,
                        2,
                        $"public static {friendlyTableName} FromReader(SqliteDataReader reader)"
                    );
                    WriteLine(writer, 2, "{");
                    WriteLine(writer, 3, $"{friendlyTableName} obj = new();");

                    // Non-dynamic columns
                    int dynamicColumnStart = columns.Count;
                    for (int i = 0; i < columns.Count; i++)
                    {
                        DatabaseColumn column = columns[i];
                        if (
                            (
                                tableName == "conversations"
                                && column.name.StartsWith(EditorConstants.k_FilterFieldPrefix)
                            )
                            || (
                                tableName == "localizations"
                                && column.name.StartsWith(EditorConstants.k_LocaleFieldPrefix)
                            )
                        )
                        {
                            dynamicColumnStart = i;
                            break;
                        }
                        else
                        {
                            string readerMethod = DatabaseTypeToReaderMethod(column.type);
                            WriteLine(
                                writer,
                                3,
                                $"obj.{column.name} = reader.GetValue({i}) is DBNull"
                            );
                            WriteLine(writer, 4, $"? {DatabaseTypeToDefaultValue(column.type)}");
                            WriteLine(writer, 4, $": reader.{readerMethod}({i})");
                            WriteLine(writer, 4, ";");
                        }
                    }

                    // Dynamic columns
                    if (tableName == "conversations")
                    {
                        WriteLine(
                            writer,
                            3,
                            "obj.filters = "
                                + $"new string[reader.FieldCount - {dynamicColumnStart}];"
                        );
                        WriteLine(writer, 3, $"for (int i = 0; i < obj.filters.Length; i++)");
                        WriteLine(writer, 3, "{");
                        WriteLine(writer, 4, $"int valueIndex = {dynamicColumnStart} + i;");
                        WriteLine(
                            writer,
                            4,
                            $"obj.filters[i] = reader.GetValue(valueIndex) is DBNull "
                                + "? string.Empty "
                                + ": reader.GetString(valueIndex);"
                        );
                        WriteLine(writer, 3, "}");
                    }
                    else if (tableName == "localizations")
                    {
                        WriteLine(
                            writer,
                            3,
                            "obj.localizations = "
                                + $"new string[reader.FieldCount - {dynamicColumnStart}];"
                        );
                        WriteLine(writer, 3, $"for (int i = 0; i < obj.localizations.Length; i++)");
                        WriteLine(writer, 3, "{");
                        WriteLine(writer, 4, $"int valueIndex = {dynamicColumnStart} + i;");
                        WriteLine(
                            writer,
                            4,
                            $"obj.localizations[i] = reader.GetValue(valueIndex) is DBNull "
                                + "? string.Empty "
                                + ": reader.GetString(valueIndex);"
                        );
                        WriteLine(writer, 3, "}");
                    }

                    WriteLine(writer, 3, "return obj;");
                    WriteLine(writer, 2, "}");
                    WriteLine(writer, 1, "}");
                    WriteLine(writer, 0, "}");
                }
            }
        }

        static string DatabaseTypeToDefaultValue(DatabaseType type)
        {
            switch (type)
            {
                case DatabaseType.TEXT:
                    return "string.Empty";
                case DatabaseType.DECIMAL:
                    return "0d";
                case DatabaseType.INTEGER:
                    return "0";
                case DatabaseType.BOOLEAN:
                    return "false";
                default:
                    throw new Exception($"Unknown database type encountered: {type}");
            }
        }

        static string DatabaseTypeToReaderMethod(DatabaseType type)
        {
            switch (type)
            {
                case DatabaseType.TEXT:
                    return "GetString";
                case DatabaseType.DECIMAL:
                    return "GetDouble";
                case DatabaseType.INTEGER:
                    return "GetInt64";
                case DatabaseType.BOOLEAN:
                    return "GetBoolean";
                default:
                    throw new Exception($"Unknown database type encountered: {type}");
            }
        }

        static string DatabaseTypeToTypeString(DatabaseType type)
        {
            switch (type)
            {
                case DatabaseType.TEXT:
                    return "string";
                case DatabaseType.DECIMAL:
                    return "double";
                case DatabaseType.INTEGER:
                    return "long";
                case DatabaseType.BOOLEAN:
                    return "bool";
                default:
                    throw new Exception($"Unknown database type encountered: {type}");
            }
        }

        static string PascalCase(string word)
        {
            return string.Join(
                "",
                word.Split('_')
                    .Select(w => w.Trim())
                    .Where(w => w.Length > 0)
                    .Select(w => w.Substring(0, 1).ToUpper() + w.Substring(1).ToLower())
            );
        }

        struct DatabaseColumn
        {
            public string name;
            public DatabaseType type;
        }

        struct TypeData
        {
            public int id;
            public string name;
        }

        enum DatabaseType
        {
            TEXT,
            DECIMAL,
            INTEGER,
            BOOLEAN,
        }
    }
}
