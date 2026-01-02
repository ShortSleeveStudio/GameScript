using System;
using System.Collections.Generic;
using System.IO;
using Mono.Data.Sqlite;
using UnityEditor;
using UnityEngine;

namespace GameScript
{
    static class ReferenceGenerator
    {
        public static ReferenceGeneratorResult GenerateAssetReferences(
            string dbPath,
            string outputDirectory
        )
        {
            int progressId = 0;
            ReferenceGeneratorResult result = new();
            string oldDir;
            string tmpDir = null;
            try
            {
                // Start progress tracking
                progressId = Progress.Start($"Generating {RuntimeConstants.k_AppName} references");

                // Ensure references directory
                string relativeOutputPath = ImportHelpers.GetProjectRelativePath(outputDirectory);

                // Ensure other directories are in the proper state
                tmpDir = PathCombine(relativeOutputPath, EditorConstants.k_ReferencesTmpFolder);
                if (AssetDatabase.AssetPathExists(tmpDir))
                    throw new Exception(
                        $"Temporary folder from a previous import still exists: {tmpDir}"
                    );
                oldDir = PathCombine(relativeOutputPath, EditorConstants.k_ReferencesOldFolder);
                if (AssetDatabase.AssetPathExists(oldDir))
                    throw new Exception(
                        $"Broken references folder from a previous import still exists: {oldDir}"
                    );

                // Create temporary directory
                AssetDatabase.CreateFolder(
                    relativeOutputPath,
                    EditorConstants.k_ReferencesTmpFolder
                );

                // Create the references
                ReferenceGenerateResult genResult = CreateReferences(progressId, dbPath, tmpDir);

                // Ensure references directory
                string refDir = PathCombine(relativeOutputPath, EditorConstants.k_ReferencesFolder);
                if (!AssetDatabase.AssetPathExists(refDir))
                {
                    AssetDatabase.CreateFolder(
                        relativeOutputPath,
                        EditorConstants.k_ReferencesFolder
                    );
                }

                // Preserve the old directory if there are broken references
                if (genResult.BrokenReferences)
                {
                    Debug.LogWarning(
                        $"Found {RuntimeConstants.k_AppName} references that no longer"
                            + $" exist. They will be left in the following directory: {oldDir}"
                    );
                    AssetDatabase.MoveAsset(refDir, oldDir);
                }
                // Delete the old heirarchy since it's empty of references
                else if (AssetDatabase.AssetPathExists(refDir))
                {
                    AssetDatabase.DeleteAsset(refDir);
                }

                // The temporary directory becomes the new references directory
                AssetDatabase.MoveAsset(tmpDir, refDir);

                // Save assets
                AssetDatabase.SaveAssets();

                // Report progress
                Progress.Report(progressId, 1f, "Done");
            }
            catch (Exception e)
            {
                Debug.LogException(e);
                if (tmpDir != null && AssetDatabase.AssetPathExists(tmpDir))
                    AssetDatabase.DeleteAsset(tmpDir);
                result.WasError = true;
            }
            finally
            {
                Progress.Remove(progressId);
            }
            return result;
        }

        private static ReferenceGenerateResult CreateReferences(
            int progressId,
            string dbPath,
            string tmpDir
        )
        {
            using (SqliteConnection connection = new(DbHelper.SqlitePathToURI(dbPath)))
            {
                connection.Open();
                Progress.Report(progressId, 0.05f, "Generating conversation references");
                ReferenceGenerateResult convResult = CreateConversationReferences(
                    connection,
                    tmpDir
                );
                Progress.Report(progressId, 0.80f, "Generating locale references");
                ReferenceGenerateResult localeResult = CreateLocaleReferences(connection, tmpDir);
                Progress.Report(progressId, 0.90f, "Generating actor references");
                ReferenceGenerateResult actorResult = CreateActorReferences(connection, tmpDir);

                return new()
                {
                    BrokenReferences =
                        convResult.BrokenReferences
                        || localeResult.BrokenReferences
                        || actorResult.BrokenReferences,
                };
            }
        }

        #region Conversations & Localizations
        private static ReferenceGenerateResult CreateConversationReferences(
            SqliteConnection connection,
            string tmpDir
        )
        {
            // Create conversations directory
            string conversationsDir = PathCombine(
                tmpDir,
                EditorConstants.k_ReferencesConversationsFolder
            );
            AssetDatabase.CreateFolder(tmpDir, EditorConstants.k_ReferencesConversationsFolder);

            // Grab lookup tables for existing assets
            Dictionary<uint, AssetInfo<ConversationReference>> idToConversationRef =
                LoadReferenceMap<ConversationReference>(typeof(ConversationReference));
            Dictionary<uint, AssetInfo<LocalizationReference>> idToLocalizationRef =
                LoadReferenceMap<LocalizationReference>(typeof(LocalizationReference));

            // Grab all filter names
            string[] filterNames = null;
            ImportHelpers.ReadTable(
                connection,
                Filters.TABLE_NAME,
                (uint count) => filterNames = new string[count],
                (uint index, SqliteDataReader filterReader) =>
                {
                    Filters filter = Filters.FromReader(filterReader);
                    filterNames[index] = filter.name;
                }
            );

            ImportHelpers.ReadTable(
                connection,
                Conversations.TABLE_NAME,
                null,
                (uint index, SqliteDataReader convReader) =>
                {
                    // Load conversation
                    Conversations conversation = Conversations.FromReader(convReader);

                    // Construct directory heirarchy
                    // +1 for root directory
                    string[] pathSegments = new string[conversation.filters.Length + 1];
                    pathSegments[0] = conversationsDir;
                    string containingDirectory = conversationsDir;
                    for (int i = 0; i < conversation.filters.Length; i++)
                    {
                        string filterValue = conversation.filters[i];
                        if (string.IsNullOrEmpty(filterValue))
                            filterValue = "";
                        string pathSegment = filterNames[i] + "_" + SanitizeFileName(filterValue);
                        pathSegments[i + 1] = pathSegment;
                        string newDir = PathCombine(containingDirectory, pathSegment);
                        if (!AssetDatabase.AssetPathExists(newDir))
                            AssetDatabase.CreateFolder(containingDirectory, pathSegment);
                        containingDirectory = newDir;
                    }

                    // Construct directory and file names
                    string conversationName = CreateConversationName(conversation);
                    string conversationLocFolderName =
                        conversationName + EditorConstants.k_LocalizationReferenceFolderSuffix;
                    string conversationPath =
                        PathCombine(containingDirectory, conversationName) + ".asset";
                    string conversationLocFolderPath = PathCombine(
                        containingDirectory,
                        conversationLocFolderName
                    );

                    // Attempt to create the conversation reference or move it if it already exists
                    MoveOrCreateAsset(idToConversationRef, (uint)conversation.id, conversationPath);

                    // Load all localizations for this conversation that aren't system created
                    bool locFolderCreated = false;
                    ImportHelpers.ReadTable(
                        connection,
                        Localizations.TABLE_NAME,
                        null,
                        (uint index, SqliteDataReader locReader) =>
                        {
                            // Grab localization
                            Localizations localization = Localizations.FromReader(locReader);
                            string localizationName = CreateLocalizationName(localization);

                            // Create new containing directory
                            if (!locFolderCreated)
                            {
                                locFolderCreated = true;
                                AssetDatabase.CreateFolder(
                                    containingDirectory,
                                    conversationLocFolderName
                                );
                            }

                            // Create localization reference
                            MoveOrCreateAsset(
                                idToLocalizationRef,
                                (uint)localization.id,
                                PathCombine(conversationLocFolderPath, localizationName) + ".asset"
                            );
                        },
                        $"WHERE parent = {conversation.id} AND is_system_created = false"
                    );
                }
            );

            // Handle global localizations
            string globalLocalizationFolder = PathCombine(
                conversationsDir,
                EditorConstants.k_LocalizationGlobalFolder
            );
            AssetDatabase.CreateFolder(
                conversationsDir,
                EditorConstants.k_LocalizationGlobalFolder
            );
            ImportHelpers.ReadTable(
                connection,
                Localizations.TABLE_NAME,
                null,
                (uint index, SqliteDataReader locReader) =>
                {
                    Localizations localization = Localizations.FromReader(locReader);
                    string localizationName = CreateLocalizationName(localization);
                    string localizationPath =
                        PathCombine(globalLocalizationFolder, localizationName) + ".asset";
                    MoveOrCreateAsset(idToLocalizationRef, (uint)localization.id, localizationPath);
                },
                "WHERE parent IS NULL and is_system_created = false"
            );

            // See if we have any broken references
            return new()
            {
                BrokenReferences = idToConversationRef.Count > 0 || idToLocalizationRef.Count > 0
            };
        }
        #endregion

        #region Locales
        private static ReferenceGenerateResult CreateLocaleReferences(
            SqliteConnection connection,
            string tmpDir
        )
        {
            // Create locale directory
            string localesDir = PathCombine(tmpDir, EditorConstants.k_ReferencesLocalesFolder);
            AssetDatabase.CreateFolder(tmpDir, EditorConstants.k_ReferencesLocalesFolder);

            // Grab lookup tables for existing actors
            Dictionary<uint, AssetInfo<LocaleReference>> idToLocaleRef =
                LoadReferenceMap<LocaleReference>(typeof(LocaleReference));

            ImportHelpers.ReadTable(
                connection,
                Locales.TABLE_NAME,
                null,
                (uint index, SqliteDataReader actorReader) =>
                {
                    // Load locale
                    Locales locale = Locales.FromReader(actorReader);

                    // Construct path
                    string actorPath = PathCombine(localesDir, CreateLocaleName(locale)) + ".asset";

                    // Attempt to create the asset or move it if it already exists
                    MoveOrCreateAsset(idToLocaleRef, (uint)locale.id, actorPath);
                }
            );

            return new() { BrokenReferences = idToLocaleRef.Count > 0 };
        }
        #endregion

        #region Actors
        private static ReferenceGenerateResult CreateActorReferences(
            SqliteConnection connection,
            string tmpDir
        )
        {
            // Create actor directory
            string actorsDir = PathCombine(tmpDir, EditorConstants.k_ReferencesActorsFolder);
            AssetDatabase.CreateFolder(tmpDir, EditorConstants.k_ReferencesActorsFolder);

            // Grab lookup tables for existing actors
            Dictionary<uint, AssetInfo<ActorReference>> idToActorRef =
                LoadReferenceMap<ActorReference>(typeof(ActorReference));

            ImportHelpers.ReadTable(
                connection,
                Actors.TABLE_NAME,
                null,
                (uint index, SqliteDataReader actorReader) =>
                {
                    // Load actor
                    Actors actor = Actors.FromReader(actorReader);

                    // Construct path
                    string actorPath = PathCombine(actorsDir, CreateActorName(actor)) + ".asset";

                    // Attempt to create the asset or move it if it already exists
                    MoveOrCreateAsset(idToActorRef, (uint)actor.id, actorPath);
                }
            );

            return new() { BrokenReferences = idToActorRef.Count > 0 };
        }
        #endregion

        #region Helpers
        private static Dictionary<uint, AssetInfo<T>> LoadReferenceMap<T>(Type t)
            where T : Reference
        {
            Dictionary<uint, AssetInfo<T>> map = new();
            string[] GUIDs = AssetDatabase.FindAssets($"t:{t.Name}");
            for (int i = 0; i < GUIDs.Length; i++)
            {
                string path = AssetDatabase.GUIDToAssetPath(GUIDs[i]);
                T assetRef = AssetDatabase.LoadAssetAtPath<T>(path);
                map[assetRef.Id] = new AssetInfo<T>(assetRef, path);
            }
            return map;
        }

        private static string CreateLocalizationName(Localizations localization)
        {
            string localizationName = string.IsNullOrEmpty(localization.name)
                ? ""
                : SanitizeFileName(localization.name);
            return "l" + localization.id + "_" + localizationName;
        }

        private static string CreateConversationName(Conversations conversation)
        {
            string conversationName = string.IsNullOrEmpty(conversation.name)
                ? ""
                : SanitizeFileName(conversation.name);
            return "c" + conversation.id + "_" + conversationName;
        }

        private static string CreateLocaleName(Locales locale)
        {
            string localeName = string.IsNullOrEmpty(locale.name)
                ? ""
                : SanitizeFileName(locale.name);
            return "L" + locale.id + "_" + localeName;
        }

        private static string CreateActorName(Actors actor)
        {
            string actorName = string.IsNullOrEmpty(actor.name) ? "" : SanitizeFileName(actor.name);
            return "a" + actor.id + "_" + actorName;
        }

        private static void MoveOrCreateAsset<T>(
            Dictionary<uint, AssetInfo<T>> map,
            uint assetId,
            string outputPath
        )
            where T : Reference
        {
            AssetInfo<T> refInfo;
            map.TryGetValue(assetId, out refInfo);
            if (refInfo != null)
            {
                AssetDatabase.MoveAsset(refInfo.AssetPath, outputPath);
            }
            else
            {
                T asset = ScriptableObject.CreateInstance<T>();
                asset.Id = assetId;
                AssetDatabase.CreateAsset(asset, outputPath);
            }

            // Clear out the map as we go so we know about references that no longer exist at the
            // end
            map.Remove(assetId);
        }

        private static string SanitizeFileName(string name)
        {
            char[] invalids = Path.GetInvalidFileNameChars();
            return string.Join("_", name.Split(invalids, StringSplitOptions.RemoveEmptyEntries))
                .TrimEnd('.');
        }

        private static string PathCombine(params string[] paths)
        {
            return string.Join('/', paths);
        }
        #endregion

        #region Helper Classes
        private class ReferenceGenerateResult
        {
            public bool BrokenReferences;
        }

        private class AssetInfo<T>
            where T : Reference
        {
            public AssetInfo(T asset, string assetPath)
            {
                Asset = asset;
                AssetPath = assetPath;
            }

            public T Asset;
            public string AssetPath;
        }
        #endregion
    }
}
