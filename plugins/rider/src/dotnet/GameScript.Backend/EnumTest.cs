using System;
using JetBrains.Application.Parts;

namespace GameScript.Backend
{
    public static class EnumTest
    {
        public static void PrintValues()
        {
            foreach (var val in Enum.GetValues(typeof(Instantiation)))
            {
                Console.WriteLine(val);
            }
        }
    }
}
