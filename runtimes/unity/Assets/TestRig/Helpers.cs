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
                NodePropertyRef prop = currentNode.GetProperty(i);
                switch (prop.Type)
                {
                    case NodePropertyType.String:
                        Debug.Log($"{prop.Name}: {prop.StringValue}");
                        break;
                    case NodePropertyType.Integer:
                        Debug.Log($"{prop.Name}: {prop.IntValue}");
                        break;
                    case NodePropertyType.Decimal:
                        Debug.Log($"{prop.Name}: {prop.FloatValue}");
                        break;
                    case NodePropertyType.Boolean:
                        Debug.Log($"{prop.Name}: {prop.BoolValue}");
                        break;
                    default:
                        Debug.Log($"{prop.Name}: Unknown property type");
                        break;
                }
            }
        }
    }
}
