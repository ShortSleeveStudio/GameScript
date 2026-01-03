using System.Collections.Generic;
using UnityEngine;

namespace GameScript
{
    public static class Helpers
    {
        public static Dictionary<string, bool> S = new();

        public static void TestNode(NodeRef currentNode)
        {
            Debug.Log($"Current Node: {currentNode.Id}");
        }

        public static void PrintProperties(NodeRef currentNode)
        {
            int count = currentNode.PropertyCount;
            for (int i = 0; i < count; i++)
            {
                NodeProperty prop = currentNode.GetProperty(i);
                PropertyValue? val = prop.Value;
                if (!val.HasValue) continue;
                switch (val.Value.Kind)
                {
                    case PropertyValue.ItemKind.string_val:
                        Debug.Log(val.Value.string_val);
                        break;
                    case PropertyValue.ItemKind.int_val:
                        Debug.Log(val.Value.int_val.Value);
                        break;
                    case PropertyValue.ItemKind.decimal_val:
                        Debug.Log(val.Value.decimal_val.Value);
                        break;
                    case PropertyValue.ItemKind.bool_val:
                        Debug.Log(val.Value.bool_val.Value);
                        break;
                    default:
                        Debug.Log("Unknown property value kind: " + val.Value.Kind);
                        break;
                }
            }
        }
    }
}
