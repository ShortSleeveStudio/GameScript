using System.IO;
using System.Text;

namespace GameScript
{
    static class StringWriter
    {
        public static void WriteLine(StreamWriter writer, int depth, string toWrite) =>
            WriteNoLine(writer, depth, toWrite + '\n');

        public static void WriteNoLine(StreamWriter writer, int depth, string toWrite)
        {
            if (depth > 0)
                writer.Write(new string(' ', depth * 4) + toWrite);
            else
                writer.Write(toWrite);
        }

        public static void AppendLine(StringBuilder writer, int depth, string toWrite) =>
            AppendNoLine(writer, depth, toWrite + '\n');

        public static void AppendNoLine(StringBuilder writer, int depth, string toWrite)
        {
            if (depth > 0)
                writer.Append(new string(' ', depth * 4) + toWrite);
            else
                writer.Append(toWrite);
        }
    }
}
