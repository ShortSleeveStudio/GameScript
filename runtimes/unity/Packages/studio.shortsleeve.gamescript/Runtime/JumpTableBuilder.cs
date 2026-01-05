using System;
using System.Collections.Generic;
using System.Reflection;
using UnityEngine;

namespace GameScript
{
    /// <summary>
    /// Delegate for synchronous condition methods.
    /// </summary>
    public delegate bool ConditionDelegate(IDialogueContext ctx);

    /// <summary>
    /// Delegate for async action methods.
    /// </summary>
    public delegate Awaitable ActionDelegate(IDialogueContext ctx);

    /// <summary>
    /// Builds jump tables for condition and action dispatch by scanning
    /// assemblies for methods marked with NodeCondition and NodeAction attributes.
    /// </summary>
    public sealed class JumpTable
    {
        public ConditionDelegate[] Conditions { get; }
        public ActionDelegate[] Actions { get; }

        internal JumpTable(ConditionDelegate[] conditions, ActionDelegate[] actions)
        {
            Conditions = conditions;
            Actions = actions;
        }
    }

    internal static class JumpTableBuilder
    {
        /// <summary>
        /// Scans all loaded assemblies for methods with NodeCondition and NodeAction
        /// attributes and builds jump tables indexed by node array index (not database ID).
        /// </summary>
        /// <param name="snapshot">The snapshot to build jump tables for.</param>
        /// <returns>A JumpTable with conditions and actions arrays parallel to snapshot.Nodes.</returns>
        public static JumpTable Build(Snapshot snapshot)
        {
            IList<Node> nodes = snapshot.Nodes;
            int nodeCount = nodes?.Count ?? 0;

            // Build a map from database ID to array index
            Dictionary<int, int> idToIndex = new Dictionary<int, int>(nodeCount);
            for (int i = 0; i < nodeCount; i++)
            {
                Node node = nodes[i];
                if (node != null)
                {
                    idToIndex[node.Id] = i;
                }
            }

            ConditionDelegate[] conditions = new ConditionDelegate[nodeCount];
            ActionDelegate[] actions = new ActionDelegate[nodeCount];

            // Scan all assemblies for attributed methods
            Assembly[] assemblies = AppDomain.CurrentDomain.GetAssemblies();
            for (int i = 0; i < assemblies.Length; i++)
            {
                Assembly assembly = assemblies[i];
                if (ShouldSkipAssembly(assembly))
                    continue;

                ScanAssembly(assembly, idToIndex, conditions, actions);
            }

            return new JumpTable(conditions, actions);
        }

        static bool ShouldSkipAssembly(Assembly assembly)
        {
            // Skip dynamic assemblies (they can't have our attributes)
            if (assembly.IsDynamic)
                return true;

            string name = assembly.GetName().Name;
            if (string.IsNullOrEmpty(name))
                return true;

            // Skip known system/framework assemblies
            // Using ordinal comparison for performance
            if (name.StartsWith("System", StringComparison.Ordinal) ||
                name.StartsWith("Microsoft", StringComparison.Ordinal) ||
                name.StartsWith("Unity", StringComparison.Ordinal) ||
                name.StartsWith("UnityEngine", StringComparison.Ordinal) ||
                name.StartsWith("UnityEditor", StringComparison.Ordinal) ||
                name.StartsWith("mscorlib", StringComparison.Ordinal) ||
                name.StartsWith("netstandard", StringComparison.Ordinal) ||
                name.StartsWith("Mono.", StringComparison.Ordinal) ||
                name.StartsWith("nunit", StringComparison.OrdinalIgnoreCase) ||
                name.StartsWith("Newtonsoft", StringComparison.Ordinal) ||
                name.Equals("GameScript.Core", StringComparison.Ordinal))
            {
                return true;
            }

            return false;
        }

        static void ScanAssembly(
            Assembly assembly,
            Dictionary<int, int> idToIndex,
            ConditionDelegate[] conditions,
            ActionDelegate[] actions)
        {
            Type[] types;
            try
            {
                types = assembly.GetTypes();
            }
            catch (ReflectionTypeLoadException e)
            {
                // Some types may fail to load, use what we can
                Debug.LogWarning($"[GameScript] Some types in assembly '{assembly.GetName().Name}' could not be loaded. Using partial type list.");
                types = e.Types;
            }

            for (int t = 0; t < types.Length; t++)
            {
                Type type = types[t];
                if (type == null) continue;

                MethodInfo[] methods = type.GetMethods(BindingFlags.Static | BindingFlags.Public | BindingFlags.NonPublic);
                for (int m = 0; m < methods.Length; m++)
                {
                    MethodInfo method = methods[m];

                    // Check for NodeCondition attribute
                    NodeConditionAttribute conditionAttr;
                    try
                    {
                        conditionAttr = method.GetCustomAttribute<NodeConditionAttribute>();
                    }
                    catch (Exception)
                    {
                        // Skip methods where we can't load attribute metadata
                        // (e.g., missing assembly references like JetBrains.Annotations)
                        continue;
                    }
                    if (conditionAttr != null)
                    {
                        if (ValidateConditionSignature(method))
                        {
                            if (idToIndex.TryGetValue(conditionAttr.NodeId, out int index))
                            {
                                conditions[index] = (ConditionDelegate)Delegate.CreateDelegate(
                                    typeof(ConditionDelegate), method);
                            }
                            else
                            {
                                Debug.LogWarning(
                                    $"[GameScript] Condition {type.FullName}.{method.Name} references " +
                                    $"unknown node ID {conditionAttr.NodeId}");
                            }
                        }
                        else
                        {
                            Debug.LogWarning(
                                $"[GameScript] Invalid condition signature for {type.FullName}.{method.Name}. " +
                                $"Expected: static bool Method(IDialogueContext ctx)");
                        }
                    }

                    // Check for NodeAction attribute
                    NodeActionAttribute actionAttr;
                    try
                    {
                        actionAttr = method.GetCustomAttribute<NodeActionAttribute>();
                    }
                    catch (Exception)
                    {
                        // Skip methods where we can't load attribute metadata
                        continue;
                    }
                    if (actionAttr != null)
                    {
                        if (ValidateActionSignature(method))
                        {
                            if (idToIndex.TryGetValue(actionAttr.NodeId, out int index))
                            {
                                actions[index] = (ActionDelegate)Delegate.CreateDelegate(
                                    typeof(ActionDelegate), method);
                            }
                            else
                            {
                                Debug.LogWarning(
                                    $"[GameScript] Action {type.FullName}.{method.Name} references " +
                                    $"unknown node ID {actionAttr.NodeId}");
                            }
                        }
                        else
                        {
                            Debug.LogWarning(
                                $"[GameScript] Invalid action signature for {type.FullName}.{method.Name}. " +
                                $"Expected: static async Awaitable Method(IDialogueContext ctx)");
                        }
                    }
                }
            }
        }

        static bool ValidateConditionSignature(MethodInfo method)
        {
            // Must be static, return bool, take single IDialogueContext parameter
            if (!method.IsStatic) return false;
            if (method.ReturnType != typeof(bool)) return false;

            ParameterInfo[] parameters = method.GetParameters();
            if (parameters.Length != 1) return false;
            if (!typeof(IDialogueContext).IsAssignableFrom(parameters[0].ParameterType)) return false;

            return true;
        }

        static bool ValidateActionSignature(MethodInfo method)
        {
            // Must be static, return Awaitable, take single IDialogueContext parameter
            if (!method.IsStatic) return false;
            if (method.ReturnType != typeof(Awaitable)) return false;

            ParameterInfo[] parameters = method.GetParameters();
            if (parameters.Length != 1) return false;
            if (!typeof(IDialogueContext).IsAssignableFrom(parameters[0].ParameterType)) return false;

            return true;
        }
    }
}
