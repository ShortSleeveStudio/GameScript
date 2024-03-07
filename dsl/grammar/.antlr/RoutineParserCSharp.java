// Generated from d:/Work/GameScript/dsl/grammar/RoutineParserCSharp.g4 by ANTLR 4.13.1
import org.antlr.v4.runtime.atn.*;
import org.antlr.v4.runtime.dfa.DFA;
import org.antlr.v4.runtime.*;
import org.antlr.v4.runtime.misc.*;
import org.antlr.v4.runtime.tree.*;
import java.util.List;
import java.util.Iterator;
import java.util.ArrayList;

@SuppressWarnings({"all", "warnings", "unchecked", "unused", "cast", "CheckReturnValue"})
public class RoutineParserCSharp extends Parser {
	static { RuntimeMetaData.checkVersion("4.13.1", RuntimeMetaData.VERSION); }

	protected static final DFA[] _decisionToDFA;
	protected static final PredictionContextCache _sharedContextCache =
		new PredictionContextCache();
	public static final int
		NODE=1, SIGNAL=2, GT=3, LT=4, DASH=5, COMMA=6, AT=7, IDENTIFIER=8, JUNK=9, 
		WHITESPACE=10, COMMENT_BLOCK=11, COMMENT_LINE=12;
	public static final int
		RULE_routine = 0, RULE_scheduled_block = 1, RULE_scheduled_block_open = 2, 
		RULE_scheduled_block_close = 3, RULE_scheduled_block_flag_list = 4, RULE_scheduled_block_block = 5, 
		RULE_code = 6;
	private static String[] makeRuleNames() {
		return new String[] {
			"routine", "scheduled_block", "scheduled_block_open", "scheduled_block_close", 
			"scheduled_block_flag_list", "scheduled_block_block", "code"
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

	@Override
	public String getGrammarFileName() { return "RoutineParserCSharp.g4"; }

	@Override
	public String[] getRuleNames() { return ruleNames; }

	@Override
	public String getSerializedATN() { return _serializedATN; }

	@Override
	public ATN getATN() { return _ATN; }

	public RoutineParserCSharp(TokenStream input) {
		super(input);
		_interp = new ParserATNSimulator(this,_ATN,_decisionToDFA,_sharedContextCache);
	}

	@SuppressWarnings("CheckReturnValue")
	public static class RoutineContext extends ParserRuleContext {
		public TerminalNode EOF() { return getToken(RoutineParserCSharp.EOF, 0); }
		public List<Scheduled_blockContext> scheduled_block() {
			return getRuleContexts(Scheduled_blockContext.class);
		}
		public Scheduled_blockContext scheduled_block(int i) {
			return getRuleContext(Scheduled_blockContext.class,i);
		}
		public RoutineContext(ParserRuleContext parent, int invokingState) {
			super(parent, invokingState);
		}
		@Override public int getRuleIndex() { return RULE_routine; }
	}

	public final RoutineContext routine() throws RecognitionException {
		RoutineContext _localctx = new RoutineContext(_ctx, getState());
		enterRule(_localctx, 0, RULE_routine);
		int _la;
		try {
			enterOuterAlt(_localctx, 1);
			{
			setState(17);
			_errHandler.sync(this);
			_la = _input.LA(1);
			while (_la==DASH) {
				{
				{
				setState(14);
				scheduled_block();
				}
				}
				setState(19);
				_errHandler.sync(this);
				_la = _input.LA(1);
			}
			setState(20);
			match(EOF);
			}
		}
		catch (RecognitionException re) {
			_localctx.exception = re;
			_errHandler.reportError(this, re);
			_errHandler.recover(this, re);
		}
		finally {
			exitRule();
		}
		return _localctx;
	}

	@SuppressWarnings("CheckReturnValue")
	public static class Scheduled_blockContext extends ParserRuleContext {
		public Scheduled_block_openContext scheduled_block_open() {
			return getRuleContext(Scheduled_block_openContext.class,0);
		}
		public Scheduled_block_blockContext scheduled_block_block() {
			return getRuleContext(Scheduled_block_blockContext.class,0);
		}
		public Scheduled_block_closeContext scheduled_block_close() {
			return getRuleContext(Scheduled_block_closeContext.class,0);
		}
		public Scheduled_blockContext(ParserRuleContext parent, int invokingState) {
			super(parent, invokingState);
		}
		@Override public int getRuleIndex() { return RULE_scheduled_block; }
	}

	public final Scheduled_blockContext scheduled_block() throws RecognitionException {
		Scheduled_blockContext _localctx = new Scheduled_blockContext(_ctx, getState());
		enterRule(_localctx, 2, RULE_scheduled_block);
		try {
			enterOuterAlt(_localctx, 1);
			{
			setState(22);
			scheduled_block_open();
			setState(23);
			scheduled_block_block();
			setState(24);
			scheduled_block_close();
			}
		}
		catch (RecognitionException re) {
			_localctx.exception = re;
			_errHandler.reportError(this, re);
			_errHandler.recover(this, re);
		}
		finally {
			exitRule();
		}
		return _localctx;
	}

	@SuppressWarnings("CheckReturnValue")
	public static class Scheduled_block_openContext extends ParserRuleContext {
		public TerminalNode DASH() { return getToken(RoutineParserCSharp.DASH, 0); }
		public TerminalNode GT() { return getToken(RoutineParserCSharp.GT, 0); }
		public Scheduled_block_flag_listContext scheduled_block_flag_list() {
			return getRuleContext(Scheduled_block_flag_listContext.class,0);
		}
		public Scheduled_block_openContext(ParserRuleContext parent, int invokingState) {
			super(parent, invokingState);
		}
		@Override public int getRuleIndex() { return RULE_scheduled_block_open; }
	}

	public final Scheduled_block_openContext scheduled_block_open() throws RecognitionException {
		Scheduled_block_openContext _localctx = new Scheduled_block_openContext(_ctx, getState());
		enterRule(_localctx, 4, RULE_scheduled_block_open);
		int _la;
		try {
			enterOuterAlt(_localctx, 1);
			{
			setState(26);
			match(DASH);
			setState(28);
			_errHandler.sync(this);
			_la = _input.LA(1);
			if (_la==IDENTIFIER) {
				{
				setState(27);
				scheduled_block_flag_list();
				}
			}

			setState(30);
			match(GT);
			}
		}
		catch (RecognitionException re) {
			_localctx.exception = re;
			_errHandler.reportError(this, re);
			_errHandler.recover(this, re);
		}
		finally {
			exitRule();
		}
		return _localctx;
	}

	@SuppressWarnings("CheckReturnValue")
	public static class Scheduled_block_closeContext extends ParserRuleContext {
		public TerminalNode LT() { return getToken(RoutineParserCSharp.LT, 0); }
		public TerminalNode DASH() { return getToken(RoutineParserCSharp.DASH, 0); }
		public Scheduled_block_flag_listContext scheduled_block_flag_list() {
			return getRuleContext(Scheduled_block_flag_listContext.class,0);
		}
		public Scheduled_block_closeContext(ParserRuleContext parent, int invokingState) {
			super(parent, invokingState);
		}
		@Override public int getRuleIndex() { return RULE_scheduled_block_close; }
	}

	public final Scheduled_block_closeContext scheduled_block_close() throws RecognitionException {
		Scheduled_block_closeContext _localctx = new Scheduled_block_closeContext(_ctx, getState());
		enterRule(_localctx, 6, RULE_scheduled_block_close);
		int _la;
		try {
			enterOuterAlt(_localctx, 1);
			{
			setState(32);
			match(LT);
			setState(34);
			_errHandler.sync(this);
			_la = _input.LA(1);
			if (_la==IDENTIFIER) {
				{
				setState(33);
				scheduled_block_flag_list();
				}
			}

			setState(36);
			match(DASH);
			}
		}
		catch (RecognitionException re) {
			_localctx.exception = re;
			_errHandler.reportError(this, re);
			_errHandler.recover(this, re);
		}
		finally {
			exitRule();
		}
		return _localctx;
	}

	@SuppressWarnings("CheckReturnValue")
	public static class Scheduled_block_flag_listContext extends ParserRuleContext {
		public List<TerminalNode> IDENTIFIER() { return getTokens(RoutineParserCSharp.IDENTIFIER); }
		public TerminalNode IDENTIFIER(int i) {
			return getToken(RoutineParserCSharp.IDENTIFIER, i);
		}
		public List<TerminalNode> COMMA() { return getTokens(RoutineParserCSharp.COMMA); }
		public TerminalNode COMMA(int i) {
			return getToken(RoutineParserCSharp.COMMA, i);
		}
		public Scheduled_block_flag_listContext(ParserRuleContext parent, int invokingState) {
			super(parent, invokingState);
		}
		@Override public int getRuleIndex() { return RULE_scheduled_block_flag_list; }
	}

	public final Scheduled_block_flag_listContext scheduled_block_flag_list() throws RecognitionException {
		Scheduled_block_flag_listContext _localctx = new Scheduled_block_flag_listContext(_ctx, getState());
		enterRule(_localctx, 8, RULE_scheduled_block_flag_list);
		int _la;
		try {
			enterOuterAlt(_localctx, 1);
			{
			setState(38);
			match(IDENTIFIER);
			setState(43);
			_errHandler.sync(this);
			_la = _input.LA(1);
			while (_la==COMMA) {
				{
				{
				setState(39);
				match(COMMA);
				setState(40);
				match(IDENTIFIER);
				}
				}
				setState(45);
				_errHandler.sync(this);
				_la = _input.LA(1);
			}
			}
		}
		catch (RecognitionException re) {
			_localctx.exception = re;
			_errHandler.reportError(this, re);
			_errHandler.recover(this, re);
		}
		finally {
			exitRule();
		}
		return _localctx;
	}

	@SuppressWarnings("CheckReturnValue")
	public static class Scheduled_block_blockContext extends ParserRuleContext {
		public List<CodeContext> code() {
			return getRuleContexts(CodeContext.class);
		}
		public CodeContext code(int i) {
			return getRuleContext(CodeContext.class,i);
		}
		public Scheduled_block_blockContext(ParserRuleContext parent, int invokingState) {
			super(parent, invokingState);
		}
		@Override public int getRuleIndex() { return RULE_scheduled_block_block; }
	}

	public final Scheduled_block_blockContext scheduled_block_block() throws RecognitionException {
		Scheduled_block_blockContext _localctx = new Scheduled_block_blockContext(_ctx, getState());
		enterRule(_localctx, 10, RULE_scheduled_block_block);
		int _la;
		try {
			enterOuterAlt(_localctx, 1);
			{
			setState(49);
			_errHandler.sync(this);
			_la = _input.LA(1);
			while ((((_la) & ~0x3f) == 0 && ((1L << _la) & 678L) != 0)) {
				{
				{
				setState(46);
				code();
				}
				}
				setState(51);
				_errHandler.sync(this);
				_la = _input.LA(1);
			}
			}
		}
		catch (RecognitionException re) {
			_localctx.exception = re;
			_errHandler.reportError(this, re);
			_errHandler.recover(this, re);
		}
		finally {
			exitRule();
		}
		return _localctx;
	}

	@SuppressWarnings("CheckReturnValue")
	public static class CodeContext extends ParserRuleContext {
		public CodeContext(ParserRuleContext parent, int invokingState) {
			super(parent, invokingState);
		}
		@Override public int getRuleIndex() { return RULE_code; }
	 
		public CodeContext() { }
		public void copyFrom(CodeContext ctx) {
			super.copyFrom(ctx);
		}
	}
	@SuppressWarnings("CheckReturnValue")
	public static class NodeContext extends CodeContext {
		public TerminalNode NODE() { return getToken(RoutineParserCSharp.NODE, 0); }
		public NodeContext(CodeContext ctx) { copyFrom(ctx); }
	}
	@SuppressWarnings("CheckReturnValue")
	public static class Junk_atContext extends CodeContext {
		public TerminalNode AT() { return getToken(RoutineParserCSharp.AT, 0); }
		public Junk_atContext(CodeContext ctx) { copyFrom(ctx); }
	}
	@SuppressWarnings("CheckReturnValue")
	public static class Junk_dashContext extends CodeContext {
		public TerminalNode DASH() { return getToken(RoutineParserCSharp.DASH, 0); }
		public Junk_dashContext(CodeContext ctx) { copyFrom(ctx); }
	}
	@SuppressWarnings("CheckReturnValue")
	public static class JunkContext extends CodeContext {
		public TerminalNode JUNK() { return getToken(RoutineParserCSharp.JUNK, 0); }
		public JunkContext(CodeContext ctx) { copyFrom(ctx); }
	}
	@SuppressWarnings("CheckReturnValue")
	public static class SignalContext extends CodeContext {
		public TerminalNode SIGNAL() { return getToken(RoutineParserCSharp.SIGNAL, 0); }
		public SignalContext(CodeContext ctx) { copyFrom(ctx); }
	}

	public final CodeContext code() throws RecognitionException {
		CodeContext _localctx = new CodeContext(_ctx, getState());
		enterRule(_localctx, 12, RULE_code);
		try {
			setState(57);
			_errHandler.sync(this);
			switch (_input.LA(1)) {
			case NODE:
				_localctx = new NodeContext(_localctx);
				enterOuterAlt(_localctx, 1);
				{
				setState(52);
				match(NODE);
				}
				break;
			case SIGNAL:
				_localctx = new SignalContext(_localctx);
				enterOuterAlt(_localctx, 2);
				{
				setState(53);
				match(SIGNAL);
				}
				break;
			case AT:
				_localctx = new Junk_atContext(_localctx);
				enterOuterAlt(_localctx, 3);
				{
				setState(54);
				match(AT);
				}
				break;
			case DASH:
				_localctx = new Junk_dashContext(_localctx);
				enterOuterAlt(_localctx, 4);
				{
				setState(55);
				match(DASH);
				}
				break;
			case JUNK:
				_localctx = new JunkContext(_localctx);
				enterOuterAlt(_localctx, 5);
				{
				setState(56);
				match(JUNK);
				}
				break;
			default:
				throw new NoViableAltException(this);
			}
		}
		catch (RecognitionException re) {
			_localctx.exception = re;
			_errHandler.reportError(this, re);
			_errHandler.recover(this, re);
		}
		finally {
			exitRule();
		}
		return _localctx;
	}

	public static final String _serializedATN =
		"\u0004\u0001\f<\u0002\u0000\u0007\u0000\u0002\u0001\u0007\u0001\u0002"+
		"\u0002\u0007\u0002\u0002\u0003\u0007\u0003\u0002\u0004\u0007\u0004\u0002"+
		"\u0005\u0007\u0005\u0002\u0006\u0007\u0006\u0001\u0000\u0005\u0000\u0010"+
		"\b\u0000\n\u0000\f\u0000\u0013\t\u0000\u0001\u0000\u0001\u0000\u0001\u0001"+
		"\u0001\u0001\u0001\u0001\u0001\u0001\u0001\u0002\u0001\u0002\u0003\u0002"+
		"\u001d\b\u0002\u0001\u0002\u0001\u0002\u0001\u0003\u0001\u0003\u0003\u0003"+
		"#\b\u0003\u0001\u0003\u0001\u0003\u0001\u0004\u0001\u0004\u0001\u0004"+
		"\u0005\u0004*\b\u0004\n\u0004\f\u0004-\t\u0004\u0001\u0005\u0005\u0005"+
		"0\b\u0005\n\u0005\f\u00053\t\u0005\u0001\u0006\u0001\u0006\u0001\u0006"+
		"\u0001\u0006\u0001\u0006\u0003\u0006:\b\u0006\u0001\u0006\u0000\u0000"+
		"\u0007\u0000\u0002\u0004\u0006\b\n\f\u0000\u0000=\u0000\u0011\u0001\u0000"+
		"\u0000\u0000\u0002\u0016\u0001\u0000\u0000\u0000\u0004\u001a\u0001\u0000"+
		"\u0000\u0000\u0006 \u0001\u0000\u0000\u0000\b&\u0001\u0000\u0000\u0000"+
		"\n1\u0001\u0000\u0000\u0000\f9\u0001\u0000\u0000\u0000\u000e\u0010\u0003"+
		"\u0002\u0001\u0000\u000f\u000e\u0001\u0000\u0000\u0000\u0010\u0013\u0001"+
		"\u0000\u0000\u0000\u0011\u000f\u0001\u0000\u0000\u0000\u0011\u0012\u0001"+
		"\u0000\u0000\u0000\u0012\u0014\u0001\u0000\u0000\u0000\u0013\u0011\u0001"+
		"\u0000\u0000\u0000\u0014\u0015\u0005\u0000\u0000\u0001\u0015\u0001\u0001"+
		"\u0000\u0000\u0000\u0016\u0017\u0003\u0004\u0002\u0000\u0017\u0018\u0003"+
		"\n\u0005\u0000\u0018\u0019\u0003\u0006\u0003\u0000\u0019\u0003\u0001\u0000"+
		"\u0000\u0000\u001a\u001c\u0005\u0005\u0000\u0000\u001b\u001d\u0003\b\u0004"+
		"\u0000\u001c\u001b\u0001\u0000\u0000\u0000\u001c\u001d\u0001\u0000\u0000"+
		"\u0000\u001d\u001e\u0001\u0000\u0000\u0000\u001e\u001f\u0005\u0003\u0000"+
		"\u0000\u001f\u0005\u0001\u0000\u0000\u0000 \"\u0005\u0004\u0000\u0000"+
		"!#\u0003\b\u0004\u0000\"!\u0001\u0000\u0000\u0000\"#\u0001\u0000\u0000"+
		"\u0000#$\u0001\u0000\u0000\u0000$%\u0005\u0005\u0000\u0000%\u0007\u0001"+
		"\u0000\u0000\u0000&+\u0005\b\u0000\u0000\'(\u0005\u0006\u0000\u0000(*"+
		"\u0005\b\u0000\u0000)\'\u0001\u0000\u0000\u0000*-\u0001\u0000\u0000\u0000"+
		"+)\u0001\u0000\u0000\u0000+,\u0001\u0000\u0000\u0000,\t\u0001\u0000\u0000"+
		"\u0000-+\u0001\u0000\u0000\u0000.0\u0003\f\u0006\u0000/.\u0001\u0000\u0000"+
		"\u000003\u0001\u0000\u0000\u00001/\u0001\u0000\u0000\u000012\u0001\u0000"+
		"\u0000\u00002\u000b\u0001\u0000\u0000\u000031\u0001\u0000\u0000\u0000"+
		"4:\u0005\u0001\u0000\u00005:\u0005\u0002\u0000\u00006:\u0005\u0007\u0000"+
		"\u00007:\u0005\u0005\u0000\u00008:\u0005\t\u0000\u000094\u0001\u0000\u0000"+
		"\u000095\u0001\u0000\u0000\u000096\u0001\u0000\u0000\u000097\u0001\u0000"+
		"\u0000\u000098\u0001\u0000\u0000\u0000:\r\u0001\u0000\u0000\u0000\u0006"+
		"\u0011\u001c\"+19";
	public static final ATN _ATN =
		new ATNDeserializer().deserialize(_serializedATN.toCharArray());
	static {
		_decisionToDFA = new DFA[_ATN.getNumberOfDecisions()];
		for (int i = 0; i < _ATN.getNumberOfDecisions(); i++) {
			_decisionToDFA[i] = new DFA(_ATN.getDecisionState(i), i);
		}
	}
}