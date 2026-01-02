using System;
using System.Collections.Generic;
using System.Data;
using System.IO;
using System.IO.Compression;
using System.Runtime.Serialization.Formatters.Binary;
using Mono.Data.Sqlite;
using UnityEditor;
using UnityEngine;

namespace GameScript
{
    static class ConversationDataGenerator
    {
        #region Constants
        private static readonly Comparison<Property> s_PropertyComparator = (
            Property p1,
            Property p2
        ) => p1.Name.CompareTo(p2.Name);
        #endregion
        public static ConversationDataGeneratorResult GenerateConversationData(
            string dbPath,
            string gameDataPath,
            Dictionary<uint, uint> routineIdToIndex
        )
        {
            int progressId = 0;
            ConversationDataGeneratorResult result = new();
            try
            {
                // Start progress tracking
                progressId = Progress.Start("Serializing conversation graphs");

                // Recreate directory
                if (Directory.Exists(gameDataPath))
                {
                    Directory.Delete(gameDataPath, true);
                }
                Directory.CreateDirectory(gameDataPath);

                // Create the data
                GameData toSerialize = CreateSerializedData(progressId, dbPath, routineIdToIndex);

                // Write to disk
                Progress.Report(progressId, 0.7f, "Serializing data");
                string path = Path.Combine(
                    gameDataPath,
                    RuntimeConstants.k_ConversationDataFilename
                );
                BinaryFormatter serializer = new();
                using (FileStream fs = new(path, FileMode.Create))
                {
                    using (GZipStream zipStream = new(fs, CompressionMode.Compress))
                    {
                        serializer.Serialize(zipStream, toSerialize);
                    }
                }
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

        static GameData CreateSerializedData(
            int progressId,
            string dbPath,
            Dictionary<uint, uint> routineIdToIndex
        )
        {
            GameData disk = new();
            using (SqliteConnection connection = new(DbHelper.SqlitePathToURI(dbPath)))
            {
                connection.Open();
                Dictionary<uint, Actor> idToActor = new();
                Dictionary<uint, Localization> idToLocalization = new();
                Dictionary<uint, PropertyTemplates> idToPropertyTemplate = new();
                Progress.Report(progressId, 0.05f, "Gathering properties");
                PopulatePropertyTemplateMap(connection, idToPropertyTemplate);
                Progress.Report(progressId, 0.1f, "Gathering localizations");
                disk.Localizations = SerializeLocalizations(connection, idToLocalization);
                Progress.Report(progressId, 0.3f, "Gathering locales");
                disk.Locales = SerializeLocales(connection, idToLocalization);
                Progress.Report(progressId, 0.4f, "Gathering actors");
                disk.Actors = SerializeActors(connection, idToLocalization, idToActor);
                Progress.Report(progressId, 0.5f, "Gathering conversations");
                disk.Conversations = SerializeConversations(
                    connection,
                    idToLocalization,
                    routineIdToIndex,
                    idToActor,
                    idToPropertyTemplate
                );
            }
            return disk;
        }

        /**
         * We only care about non-system created localizations, but we're also populating the global
         * lookup table. Furthermore, we won't be retaining empty localizations that are system
         * created. We'll keep empty user-created localizations just so they don't get any
         * surprises.
         */
        static Localization[] SerializeLocalizations(
            SqliteConnection connection,
            Dictionary<uint, Localization> idToLocalization
        )
        {
            List<Localization> localizationList = new();
            ImportHelpers.ReadTable(
                connection,
                Localizations.TABLE_NAME,
                null,
                (uint index, SqliteDataReader reader) =>
                {
                    Localizations localization = Localizations.FromReader(reader);

                    // Grab list of localized strings in order of locale id, remeber if all strings
                    // are empty
                    bool allEmpty = true;
                    for (int j = 0; j < localization.localizations.Length; j++)
                    {
                        string localizationString = localization.localizations[j];
                        if (!string.IsNullOrEmpty(localizationString))
                            allEmpty = false;
                    }

                    // Create disk localization
                    Localization diskLocalization =
                        new()
                        {
                            Id = (uint)localization.id,
                            Localizations = localization.localizations,
                        };

                    // Add disk localization to lookup table
                    idToLocalization.Add(diskLocalization.Id, allEmpty ? null : diskLocalization);

                    // Add localization to list (if this is non-system created)
                    if (!localization.is_system_created)
                    {
                        localizationList.Add(diskLocalization);
                    }
                }
            );
            return localizationList.ToArray();
        }

        static Locale[] SerializeLocales(
            SqliteConnection connection,
            Dictionary<uint, Localization> idToLocalization
        )
        {
            Locale[] locales = null;
            ImportHelpers.ReadTable(
                connection,
                Locales.TABLE_NAME,
                (uint count) =>
                {
                    locales = new Locale[count];
                },
                (uint index, SqliteDataReader reader) =>
                {
                    Locales locale = Locales.FromReader(reader);
                    locales[index] = new()
                    {
                        Id = (uint)locale.id,
                        Index = index,
                        Name = locale.name,
                        LocalizedName = idToLocalization[(uint)locale.localized_name],
                    };
                }
            );
            return locales;
        }

        static Actor[] SerializeActors(
            SqliteConnection connection,
            Dictionary<uint, Localization> idToLocalization,
            Dictionary<uint, Actor> idToActor
        )
        {
            Actor[] actors = null;
            ImportHelpers.ReadTable(
                connection,
                Actors.TABLE_NAME,
                (uint count) =>
                {
                    actors = new Actor[count];
                },
                (uint index, SqliteDataReader reader) =>
                {
                    Actors actor = Actors.FromReader(reader);
                    Actor diskActor =
                        new()
                        {
                            Id = (uint)actor.id,
                            Name = actor.name,
                            LocalizedName = idToLocalization[(uint)actor.localized_name],
                        };
                    actors[index] = diskActor;
                    idToActor[diskActor.Id] = diskActor;
                }
            );
            return actors;
        }

        static Conversation[] SerializeConversations(
            SqliteConnection connection,
            Dictionary<uint, Localization> idToLocalization,
            Dictionary<uint, uint> routineIdToIndex,
            Dictionary<uint, Actor> idToActor,
            Dictionary<uint, PropertyTemplates> idToPropertyTemplate
        )
        {
            // Gather all conversation data
            Conversation[] conversations = null;
            Dictionary<uint, Edge> nodeIdToEdgeMissingTarget = new();
            Dictionary<uint, Node> idToNode = new(); // All nodes in game
            ImportHelpers.ReadTable(
                connection,
                Conversations.TABLE_NAME,
                (uint count) =>
                {
                    conversations = new Conversation[count];
                },
                (uint index, SqliteDataReader reader) =>
                {
                    Conversations conversation = Conversations.FromReader(reader);
                    Node root;
                    conversations[index] = new()
                    {
                        Id = (uint)conversation.id,
                        Name = conversation.name,
                        Nodes = FetchNodesForConversation(
                            connection,
                            (uint)conversation.id,
                            idToLocalization,
                            routineIdToIndex,
                            nodeIdToEdgeMissingTarget,
                            idToNode,
                            idToActor,
                            idToPropertyTemplate,
                            out root
                        ),
                        RootNode = root,
                    };
                },
                "WHERE is_deleted = false"
            );

            // Handle all edges that link outside of their conversations
            foreach (KeyValuePair<uint, Edge> entry in nodeIdToEdgeMissingTarget)
            {
                entry.Value.Target = idToNode[entry.Key];
            }

            return conversations;
        }

        static void PopulatePropertyTemplateMap(
            SqliteConnection connection,
            Dictionary<uint, PropertyTemplates> idToPropertyTemplate
        )
        {
            string query = $"SELECT * FROM {EditorConstants.k_PropertyTemplateTableName};";
            using (SqliteCommand command = connection.CreateCommand())
            {
                command.CommandType = CommandType.Text;
                command.CommandText = query;
                using (SqliteDataReader reader = command.ExecuteReader())
                {
                    while (reader.Read())
                    {
                        PropertyTemplates template = PropertyTemplates.FromReader(reader);
                        idToPropertyTemplate[(uint)template.id] = template;
                    }
                }
            }
        }

        static Node[] FetchNodesForConversation(
            SqliteConnection connection,
            uint conversationId,
            Dictionary<uint, Localization> idToLocalization,
            Dictionary<uint, uint> routineIdToIndex,
            Dictionary<uint, Edge> nodeIdToEdgeMissingTarget,
            Dictionary<uint, Node> idToNode,
            Dictionary<uint, Actor> idToActor,
            Dictionary<uint, PropertyTemplates> idToPropertyTemplate,
            out Node rootNode
        )
        {
            // Gather all nodes, populated without edges
            Dictionary<uint, List<Edge>> nodeIdToOutgoingEdges = new();
            Node root = null;
            Node[] nodes = FetchConversationChildObjects(
                connection,
                Nodes.TABLE_NAME,
                conversationId,
                (SqliteDataReader reader) =>
                {
                    Nodes node = Nodes.FromReader(reader);

                    // Note:
                    // If these don't exist in the map, it means they were noop routines. Moreover,
                    // if these were null (for root nodes), they'd default to 0 and not exist in the
                    // map. For either of these cases, we explicitly set them to the noop code and
                    // condition routines.
                    uint condition = routineIdToIndex.ContainsKey((uint)node.condition)
                        ? routineIdToIndex[(uint)node.condition]
                        : routineIdToIndex[EditorConstants.k_NoopRoutineConditionId];
                    // Handle default routines
                    if (node.code_override != -1)
                        node.code = node.code_override;
                    uint code = routineIdToIndex.ContainsKey((uint)node.code)
                        ? routineIdToIndex[(uint)node.code]
                        : routineIdToIndex[EditorConstants.k_NoopRoutineCodeId];

                    Node diskNode =
                        new()
                        {
                            Id = (uint)node.id,
                            Actor = idToActor[(uint)node.actor],
                            Condition = condition,
                            Code = code,
                            IsPreventResponse = node.is_prevent_response,
                        };

                    // Note: Root nodes don't have localizations or code.
                    if (node.type == "root")
                    {
                        diskNode.UIResponseText = null;
                        diskNode.VoiceText = null;
                        root = diskNode;
                    }
                    else
                    {
                        diskNode.UIResponseText = idToLocalization[(uint)node.ui_response_text];
                        diskNode.VoiceText = idToLocalization[(uint)node.voice_text];
                    }

                    // Add to node lookup table
                    idToNode.Add(diskNode.Id, diskNode);
                    return diskNode;
                }
            );
            rootNode = root;

            // Gather edges and populate nodes
            // Note: because we may eventually wish to link from one conversation to another
            //       we'll maintain a map of edges that are missing targets.
            Edge[] edges = FetchConversationChildObjects(
                connection,
                Edges.TABLE_NAME,
                conversationId,
                (SqliteDataReader reader) =>
                {
                    Edges edge = Edges.FromReader(reader);

                    uint sourceId = (uint)edge.source;
                    uint targetId = (uint)edge.target;
                    Edge diskEdge = new Edge()
                    {
                        Id = (uint)edge.id,
                        Source = idToNode[sourceId],
                        Priority = (byte)edge.priority,
                    };

                    // Set target node
                    Node targetNode;
                    idToNode.TryGetValue(targetId, out targetNode);
                    if (targetNode == null)
                        nodeIdToEdgeMissingTarget.Add(targetId, diskEdge);
                    else
                        diskEdge.Target = targetNode;

                    // Add to outgoing edge list
                    AddToEdgeList(nodeIdToOutgoingEdges, sourceId, diskEdge);

                    return diskEdge;
                }
            );

            // Populate node's edge field and properties
            for (int i = 0; i < nodes.Length; i++)
            {
                Node node = nodes[i];

                // Edges
                List<Edge> outgoingEdges;
                nodeIdToOutgoingEdges.TryGetValue(node.Id, out outgoingEdges);
                if (outgoingEdges == null)
                    node.OutgoingEdges = new Edge[0];
                else
                    node.OutgoingEdges = nodeIdToOutgoingEdges[node.Id].ToArray();

                // Properties
                node.Properties = FetchProperties(connection, node.Id, idToPropertyTemplate);
            }
            return nodes;
        }

        static void AddToEdgeList(Dictionary<uint, List<Edge>> map, uint nodeId, Edge edge)
        {
            List<Edge> edgeList;
            map.TryGetValue(nodeId, out edgeList);
            if (edgeList == null)
            {
                edgeList = new();
                map[nodeId] = edgeList;
            }
            edgeList.Add(edge);
        }

        static T[] FetchConversationChildObjects<T>(
            SqliteConnection connection,
            string tableName,
            uint conversationId,
            Func<SqliteDataReader, T> childCreator
        )
        {
            long count = 0;
            string whereClause = $"WHERE parent = {conversationId}";
            using (SqliteCommand command = connection.CreateCommand())
            {
                command.CommandType = CommandType.Text;
                command.CommandText = $"SELECT COUNT(*) as count FROM {tableName} {whereClause};";
                using (SqliteDataReader nodeReader = command.ExecuteReader())
                {
                    while (nodeReader.Read())
                        count = nodeReader.GetInt64(0);
                }
            }

            string nodeQuery = $"SELECT * FROM {tableName} {whereClause};";
            T[] objs = new T[count];
            using (SqliteCommand command = connection.CreateCommand())
            {
                uint j = 0;
                command.CommandType = CommandType.Text;
                command.CommandText = nodeQuery;
                using (SqliteDataReader nodeReader = command.ExecuteReader())
                {
                    while (nodeReader.Read())
                        objs[j++] = childCreator(nodeReader);
                }
            }
            return objs;
        }

        static Property[] FetchProperties(
            SqliteConnection connection,
            uint parentId,
            Dictionary<uint, PropertyTemplates> idToPropertyTemplate
        )
        {
            // Fetch property count
            long count = 0;
            string whereClause = $"WHERE parent = {parentId};";
            using (SqliteCommand command = connection.CreateCommand())
            {
                command.CommandType = CommandType.Text;
                command.CommandText =
                    $"SELECT COUNT(*) as count FROM {EditorConstants.k_PropertiesTableName} "
                    + $"{whereClause};";
                using (SqliteDataReader nodeReader = command.ExecuteReader())
                {
                    while (nodeReader.Read())
                        count = nodeReader.GetInt64(0);
                }
            }
            if (count == 0)
                return null;

            // Fetch properties
            Property[] properties = new Property[count];
            string query = $"SELECT * FROM {EditorConstants.k_PropertiesTableName} {whereClause}";
            using (SqliteCommand command = connection.CreateCommand())
            {
                uint j = 0;
                command.CommandType = CommandType.Text;
                command.CommandText = query;
                using (SqliteDataReader reader = command.ExecuteReader())
                {
                    while (reader.Read())
                    {
                        NodeProperties property = NodeProperties.FromReader(reader);
                        PropertyTemplates template = idToPropertyTemplate[(uint)property.template];
                        switch ((PropertyType)template.type)
                        {
                            case PropertyType.String:
                                properties[j++] = new StringProperty(
                                    template.name,
                                    property.value_string
                                );
                                break;
                            case PropertyType.Integer:
                                properties[j++] = new IntegerProperty(
                                    template.name,
                                    (int)property.value_integer
                                );
                                break;
                            case PropertyType.Decimal:
                                properties[j++] = new DecimalProperty(
                                    template.name,
                                    (float)property.value_decimal
                                );
                                break;
                            case PropertyType.Boolean:
                                properties[j++] = new BooleanProperty(
                                    template.name,
                                    property.value_boolean
                                );
                                break;
                            case PropertyType.Empty:
                                properties[j++] = new EmptyProperty(template.name);
                                break;
                            default:
                                throw new Exception("Encountered unknown property type");
                        }
                    }
                }
            }
            // Must sort array to allow for binary search of needed
            Array.Sort(properties, s_PropertyComparator);
            return properties;
        }
    }
}
