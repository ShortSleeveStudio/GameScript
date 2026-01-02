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

    public static class JumpTableBuilder
    {
        /// <summary>
        /// Scans all loaded assemblies for methods with NodeCondition and NodeAction
        /// attributes and builds jump tables indexed by node array index (not database ID).
        /// </summary>
        /// <param name="snapshot">The snapshot to build jump tables for.</param>
        /// <returns>A JumpTable with conditions and actions arrays parallel to snapshot.Nodes.</returns>
        public static JumpTable Build(Snapshot snapshot)
        {
            int nodeCount = snapshot.NodesLength;

            // Build a map from database ID to array index
            var idToIndex = new Dictionary<int, int>(nodeCount);
            for (int i = 0; i < nodeCount; i++)
            {
                var node = snapshot.Nodes(i);
                if (node.HasValue)
                {
                    idToIndex[node.Value.Id] = i;
                }
            }

            var conditions = new ConditionDelegate[nodeCount];
            var actions = new ActionDelegate[nodeCount];

            // Scan all assemblies for attributed methods
            foreach (var assembly in AppDomain.CurrentDomain.GetAssemblies())
            {
                // Skip system assemblies for performance
                var name = assembly.GetName().Name;
                if (name.StartsWith("System") ||
                    name.StartsWith("Microsoft") ||
                    name.StartsWith("Unity") ||
                    name.StartsWith("mscorlib") ||
                    name.StartsWith("netstandard"))
                {
                    continue;
                }

                ScanAssembly(assembly, idToIndex, conditions, actions);
            }

            return new JumpTable(conditions, actions);
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
                types = e.Types;
            }

            foreach (var type in types)
            {
                if (type == null) continue;

                foreach (var method in type.GetMethods(
                    BindingFlags.Static | BindingFlags.Public | BindingFlags.NonPublic))
                {
                    // Check for NodeCondition attribute
                    var conditionAttr = method.GetCustomAttribute<NodeConditionAttribute>();
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
                    var actionAttr = method.GetCustomAttribute<NodeActionAttribute>();
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

            var parameters = method.GetParameters();
            if (parameters.Length != 1) return false;
            if (!typeof(IDialogueContext).IsAssignableFrom(parameters[0].ParameterType)) return false;

            return true;
        }

        static bool ValidateActionSignature(MethodInfo method)
        {
            // Must be static, return Awaitable, take single IDialogueContext parameter
            if (!method.IsStatic) return false;
            if (method.ReturnType != typeof(Awaitable)) return false;

            var parameters = method.GetParameters();
            if (parameters.Length != 1) return false;
            if (!typeof(IDialogueContext).IsAssignableFrom(parameters[0].ParameterType)) return false;

            return true;
        }
    }
}
