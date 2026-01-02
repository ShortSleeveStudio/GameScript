using System.IO;
using Antlr4.Runtime;

namespace GameScript
{
    class TranspileErrorListener : BaseErrorListener
    {
        public int ErrorLine { get; private set; }
        public int ErrorColumn { get; private set; }
        public bool WasError { get; private set; }
        public string ErrorMessage { get; private set; }

        public override void SyntaxError(
            TextWriter output,
            IRecognizer recognizer,
            IToken offendingSymbol,
            int line,
            int charPositionInLine,
            string msg,
            RecognitionException e
        )
        {
            if (WasError)
                return;
            WasError = true;
            ErrorLine = line;
            ErrorColumn = charPositionInLine;
            ErrorMessage = msg;
        }
    }
}
