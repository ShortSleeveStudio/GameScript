using System.Collections.Generic;
using System.Threading.Tasks;
using UnityEngine;

namespace GameScript
{
    public static class Helpers
    {
        public static Dictionary<string, bool> S = new();

        public static async void TestLease(Lease lease, int millis = 1000)
        {
            Debug.Log($"Waiting {millis} milliseconds");
            await Task.Delay(millis);
            Debug.Log("Done waiting, let's do this!");
            lease.Release();
        }

        public static void TestNode(Node currentNode)
        {
            Debug.Log($"Current Node: {currentNode.Id}");
        }

        public static void PrintProperties(Node currentNode)
        {
            if (currentNode.Properties != null)
            {
                for (int i = 0; i < currentNode.Properties.Length; i++)
                {
                    Property prop = currentNode.Properties[i];
                    switch (prop)
                    {
                        case StringProperty stringProperty:
                            Debug.Log(stringProperty.GetString());
                            break;
                        case IntegerProperty integerProperty:
                            Debug.Log(integerProperty.GetInteger());
                            break;
                        case DecimalProperty decimalProperty:
                            Debug.Log(decimalProperty.GetDecimal());
                            break;
                        case BooleanProperty booleanProperty:
                            Debug.Log(booleanProperty.GetBoolean());
                            break;
                        case EmptyProperty:
                            Debug.Log("empty");
                            break;
                        default:
                            Debug.Log("Unknown Prop type: " + prop);
                            break;
                    }
                }
            }
        }
    }
}
