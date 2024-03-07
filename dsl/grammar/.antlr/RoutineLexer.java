// Generated from d:/Work/GameScript/dsl/grammar/RoutineLexer.g4 by ANTLR 4.13.1
import org.antlr.v4.runtime.Lexer;
import org.antlr.v4.runtime.CharStream;
import org.antlr.v4.runtime.Token;
import org.antlr.v4.runtime.TokenStream;
import org.antlr.v4.runtime.*;
import org.antlr.v4.runtime.atn.*;
import org.antlr.v4.runtime.dfa.DFA;
import org.antlr.v4.runtime.misc.*;

@SuppressWarnings({"all", "warnings", "unchecked", "unused", "cast", "CheckReturnValue", "this-escape"})
public class RoutineLexer extends Lexer {
	static { RuntimeMetaData.checkVersion("4.13.1", RuntimeMetaData.VERSION); }

	protected static final DFA[] _decisionToDFA;
	protected static final PredictionContextCache _sharedContextCache =
		new PredictionContextCache();
	public static final int
		NODE=1, SIGNAL=2, GT=3, LT=4, DASH=5, COMMA=6, AT=7, IDENTIFIER=8, JUNK=9, 
		WHITESPACE=10, COMMENT_BLOCK=11, COMMENT_LINE=12;
	public static String[] channelNames = {
		"DEFAULT_TOKEN_CHANNEL", "HIDDEN"
	};

	public static String[] modeNames = {
		"DEFAULT_MODE"
	};

	private static String[] makeRuleNames() {
		return new String[] {
			"NODE", "SIGNAL", "GT", "LT", "DASH", "COMMA", "AT", "IDENTIFIER", "LetterOrDigit", 
			"Digit", "NonZeroDigit", "Letter", "JUNK", "WHITESPACE", "COMMENT_BLOCK", 
			"COMMENT_LINE"
		};
	}
	public static final String[] ruleNames = makeRuleNames();

	private static String[] makeLiteralNames() {
		return new String[] {
			null, "'@node'", "'@sig'", "'>'", "'<'", "'-'", "','", "'@'"
		};
	}
	private static final String[] _LITERAL_NAMES = makeLiteralNames();
	private static String[] makeSymbolicNames() {
		return new String[] {
			null, "NODE", "SIGNAL", "GT", "LT", "DASH", "COMMA", "AT", "IDENTIFIER", 
			"JUNK", "WHITESPACE", "COMMENT_BLOCK", "COMMENT_LINE"
		};
	}
	private static final String[] _SYMBOLIC_NAMES = makeSymbolicNames();
	public static final Vocabulary VOCABULARY = new VocabularyImpl(_LITERAL_NAMES, _SYMBOLIC_NAMES);

	/**
	 * @deprecated Use {@link #VOCABULARY} instead.
	 */
	@Deprecated
	public static final String[] tokenNames;
	static {
		tokenNames = new String[_SYMBOLIC_NAMES.length];
		for (int i = 0; i < tokenNames.length; i++) {
			tokenNames[i] = VOCABULARY.getLiteralName(i);
			if (tokenNames[i] == null) {
				tokenNames[i] = VOCABULARY.getSymbolicName(i);
			}

			if (tokenNames[i] == null) {
				tokenNames[i] = "<INVALID>";
			}
		}
	}

	@Override
	@Deprecated
	public String[] getTokenNames() {
		return tokenNames;
	}

	@Override

	public Vocabulary getVocabulary() {
		return VOCABULARY;
	}


	public RoutineLexer(CharStream input) {
		super(input);
		_interp = new LexerATNSimulator(this,_ATN,_decisionToDFA,_sharedContextCache);
	}

	@Override
	public String getGrammarFileName() { return "RoutineLexer.g4"; }

	@Override
	public String[] getRuleNames() { return ruleNames; }

	@Override
	public String getSerializedATN() { return _serializedATN; }

	@Override
	public String[] getChannelNames() { return channelNames; }

	@Override
	public String[] getModeNames() { return modeNames; }

	@Override
	public ATN getATN() { return _ATN; }

	public static final String _serializedATN =
		"\u0004\u0000\fn\u0006\uffff\uffff\u0002\u0000\u0007\u0000\u0002\u0001"+
		"\u0007\u0001\u0002\u0002\u0007\u0002\u0002\u0003\u0007\u0003\u0002\u0004"+
		"\u0007\u0004\u0002\u0005\u0007\u0005\u0002\u0006\u0007\u0006\u0002\u0007"+
		"\u0007\u0007\u0002\b\u0007\b\u0002\t\u0007\t\u0002\n\u0007\n\u0002\u000b"+
		"\u0007\u000b\u0002\f\u0007\f\u0002\r\u0007\r\u0002\u000e\u0007\u000e\u0002"+
		"\u000f\u0007\u000f\u0001\u0000\u0001\u0000\u0001\u0000\u0001\u0000\u0001"+
		"\u0000\u0001\u0000\u0001\u0001\u0001\u0001\u0001\u0001\u0001\u0001\u0001"+
		"\u0001\u0001\u0002\u0001\u0002\u0001\u0003\u0001\u0003\u0001\u0004\u0001"+
		"\u0004\u0001\u0005\u0001\u0005\u0001\u0006\u0001\u0006\u0001\u0007\u0001"+
		"\u0007\u0005\u00079\b\u0007\n\u0007\f\u0007<\t\u0007\u0001\b\u0001\b\u0003"+
		"\b@\b\b\u0001\t\u0001\t\u0003\tD\b\t\u0001\n\u0001\n\u0001\u000b\u0001"+
		"\u000b\u0001\f\u0004\fK\b\f\u000b\f\f\fL\u0001\r\u0004\rP\b\r\u000b\r"+
		"\f\rQ\u0001\r\u0001\r\u0001\u000e\u0001\u000e\u0001\u000e\u0001\u000e"+
		"\u0005\u000eZ\b\u000e\n\u000e\f\u000e]\t\u000e\u0001\u000e\u0001\u000e"+
		"\u0001\u000e\u0001\u000e\u0001\u000e\u0001\u000f\u0001\u000f\u0001\u000f"+
		"\u0001\u000f\u0005\u000fh\b\u000f\n\u000f\f\u000fk\t\u000f\u0001\u000f"+
		"\u0001\u000f\u0001[\u0000\u0010\u0001\u0001\u0003\u0002\u0005\u0003\u0007"+
		"\u0004\t\u0005\u000b\u0006\r\u0007\u000f\b\u0011\u0000\u0013\u0000\u0015"+
		"\u0000\u0017\u0000\u0019\t\u001b\n\u001d\u000b\u001f\f\u0001\u0000\u0005"+
		"\u0001\u000019\u0003\u0000AZ__az\u0003\u0000--@@^^\u0003\u0000\t\n\f\r"+
		"  \u0002\u0000\n\n\r\rp\u0000\u0001\u0001\u0000\u0000\u0000\u0000\u0003"+
		"\u0001\u0000\u0000\u0000\u0000\u0005\u0001\u0000\u0000\u0000\u0000\u0007"+
		"\u0001\u0000\u0000\u0000\u0000\t\u0001\u0000\u0000\u0000\u0000\u000b\u0001"+
		"\u0000\u0000\u0000\u0000\r\u0001\u0000\u0000\u0000\u0000\u000f\u0001\u0000"+
		"\u0000\u0000\u0000\u0019\u0001\u0000\u0000\u0000\u0000\u001b\u0001\u0000"+
		"\u0000\u0000\u0000\u001d\u0001\u0000\u0000\u0000\u0000\u001f\u0001\u0000"+
		"\u0000\u0000\u0001!\u0001\u0000\u0000\u0000\u0003\'\u0001\u0000\u0000"+
		"\u0000\u0005,\u0001\u0000\u0000\u0000\u0007.\u0001\u0000\u0000\u0000\t"+
		"0\u0001\u0000\u0000\u0000\u000b2\u0001\u0000\u0000\u0000\r4\u0001\u0000"+
		"\u0000\u0000\u000f6\u0001\u0000\u0000\u0000\u0011?\u0001\u0000\u0000\u0000"+
		"\u0013C\u0001\u0000\u0000\u0000\u0015E\u0001\u0000\u0000\u0000\u0017G"+
		"\u0001\u0000\u0000\u0000\u0019J\u0001\u0000\u0000\u0000\u001bO\u0001\u0000"+
		"\u0000\u0000\u001dU\u0001\u0000\u0000\u0000\u001fc\u0001\u0000\u0000\u0000"+
		"!\"\u0005@\u0000\u0000\"#\u0005n\u0000\u0000#$\u0005o\u0000\u0000$%\u0005"+
		"d\u0000\u0000%&\u0005e\u0000\u0000&\u0002\u0001\u0000\u0000\u0000\'(\u0005"+
		"@\u0000\u0000()\u0005s\u0000\u0000)*\u0005i\u0000\u0000*+\u0005g\u0000"+
		"\u0000+\u0004\u0001\u0000\u0000\u0000,-\u0005>\u0000\u0000-\u0006\u0001"+
		"\u0000\u0000\u0000./\u0005<\u0000\u0000/\b\u0001\u0000\u0000\u000001\u0005"+
		"-\u0000\u00001\n\u0001\u0000\u0000\u000023\u0005,\u0000\u00003\f\u0001"+
		"\u0000\u0000\u000045\u0005@\u0000\u00005\u000e\u0001\u0000\u0000\u0000"+
		"6:\u0003\u0017\u000b\u000079\u0003\u0011\b\u000087\u0001\u0000\u0000\u0000"+
		"9<\u0001\u0000\u0000\u0000:8\u0001\u0000\u0000\u0000:;\u0001\u0000\u0000"+
		"\u0000;\u0010\u0001\u0000\u0000\u0000<:\u0001\u0000\u0000\u0000=@\u0003"+
		"\u0017\u000b\u0000>@\u0003\u0013\t\u0000?=\u0001\u0000\u0000\u0000?>\u0001"+
		"\u0000\u0000\u0000@\u0012\u0001\u0000\u0000\u0000AD\u00050\u0000\u0000"+
		"BD\u0003\u0015\n\u0000CA\u0001\u0000\u0000\u0000CB\u0001\u0000\u0000\u0000"+
		"D\u0014\u0001\u0000\u0000\u0000EF\u0007\u0000\u0000\u0000F\u0016\u0001"+
		"\u0000\u0000\u0000GH\u0007\u0001\u0000\u0000H\u0018\u0001\u0000\u0000"+
		"\u0000IK\u0007\u0002\u0000\u0000JI\u0001\u0000\u0000\u0000KL\u0001\u0000"+
		"\u0000\u0000LJ\u0001\u0000\u0000\u0000LM\u0001\u0000\u0000\u0000M\u001a"+
		"\u0001\u0000\u0000\u0000NP\u0007\u0003\u0000\u0000ON\u0001\u0000\u0000"+
		"\u0000PQ\u0001\u0000\u0000\u0000QO\u0001\u0000\u0000\u0000QR\u0001\u0000"+
		"\u0000\u0000RS\u0001\u0000\u0000\u0000ST\u0006\r\u0000\u0000T\u001c\u0001"+
		"\u0000\u0000\u0000UV\u0005/\u0000\u0000VW\u0005*\u0000\u0000W[\u0001\u0000"+
		"\u0000\u0000XZ\t\u0000\u0000\u0000YX\u0001\u0000\u0000\u0000Z]\u0001\u0000"+
		"\u0000\u0000[\\\u0001\u0000\u0000\u0000[Y\u0001\u0000\u0000\u0000\\^\u0001"+
		"\u0000\u0000\u0000][\u0001\u0000\u0000\u0000^_\u0005*\u0000\u0000_`\u0005"+
		"/\u0000\u0000`a\u0001\u0000\u0000\u0000ab\u0006\u000e\u0001\u0000b\u001e"+
		"\u0001\u0000\u0000\u0000cd\u0005/\u0000\u0000de\u0005/\u0000\u0000ei\u0001"+
		"\u0000\u0000\u0000fh\b\u0004\u0000\u0000gf\u0001\u0000\u0000\u0000hk\u0001"+
		"\u0000\u0000\u0000ig\u0001\u0000\u0000\u0000ij\u0001\u0000\u0000\u0000"+
		"jl\u0001\u0000\u0000\u0000ki\u0001\u0000\u0000\u0000lm\u0006\u000f\u0001"+
		"\u0000m \u0001\u0000\u0000\u0000\b\u0000:?CLQ[i\u0002\u0006\u0000\u0000"+
		"\u0000\u0001\u0000";
	public static final ATN _ATN =
		new ATNDeserializer().deserialize(_serializedATN.toCharArray());
	static {
		_decisionToDFA = new DFA[_ATN.getNumberOfDecisions()];
		for (int i = 0; i < _ATN.getNumberOfDecisions(); i++) {
			_decisionToDFA[i] = new DFA(_ATN.getDecisionState(i), i);
		}
	}
}