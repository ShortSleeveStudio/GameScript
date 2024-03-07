// Generated from d:/Work/GameScript/dsl/grammar/RoutineParser.g4 by ANTLR 4.13.1
import org.antlr.v4.runtime.atn.*;
import org.antlr.v4.runtime.dfa.DFA;
import org.antlr.v4.runtime.*;
import org.antlr.v4.runtime.misc.*;
import org.antlr.v4.runtime.tree.*;
import java.util.List;
import java.util.Iterator;
import java.util.ArrayList;

@SuppressWarnings({"all", "warnings", "unchecked", "unused", "cast", "CheckReturnValue"})
public class RoutineParser extends Parser {
	static { RuntimeMetaData.checkVersion("4.13.1", RuntimeMetaData.VERSION); }

	protected static final DFA[] _decisionToDFA;
	protected static final PredictionContextCache _sharedContextCache =
		new PredictionContextCache();
	public static final int
		NODE=1, SIGNAL=2, GT=3, LT=4, DASH=5, COMMA=6, AT=7, IDENTIFIER=8, JUNK=9, 
		WHITESPACE=10, COMMENT_BLOCK=11, COMMENT_LINE=12;
	public static final int
		RULE_routine = 0, RULE_scheduled_block = 1, RULE_scheduled_block_open = 2, 
		RULE_scheduled_block_close = 3, RULE_scheduled_block_flag_list = 4, RULE_code = 5;
	private static String[] makeRuleNames() {
		return new String[] {
			"routine", "scheduled_block", "scheduled_block_open", "scheduled_block_close", 
			"scheduled_block_flag_list", "code"
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
	public String getGrammarFileName() { return "RoutineParser.g4"; }

	@Override
	public String[] getRuleNames() { return ruleNames; }

	@Override
	public String getSerializedATN() { return _serializedATN; }

	@Override
	public ATN getATN() { return _ATN; }

	public RoutineParser(TokenStream input) {
		super(input);
		_interp = new ParserATNSimulator(this,_ATN,_decisionToDFA,_sharedContextCache);
	}

	@SuppressWarnings("CheckReturnValue")
	public static class RoutineContext extends ParserRuleContext {
		public TerminalNode EOF() { return getToken(RoutineParser.EOF, 0); }
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
			setState(15);
			_errHandler.sync(this);
			_la = _input.LA(1);
			while (_la==DASH) {
				{
				{
				setState(12);
				scheduled_block();
				}
				}
				setState(17);
				_errHandler.sync(this);
				_la = _input.LA(1);
			}
			setState(18);
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
		public Scheduled_block_closeContext scheduled_block_close() {
			return getRuleContext(Scheduled_block_closeContext.class,0);
		}
		public List<CodeContext> code() {
			return getRuleContexts(CodeContext.class);
		}
		public CodeContext code(int i) {
			return getRuleContext(CodeContext.class,i);
		}
		public Scheduled_blockContext(ParserRuleContext parent, int invokingState) {
			super(parent, invokingState);
		}
		@Override public int getRuleIndex() { return RULE_scheduled_block; }
	}

	public final Scheduled_blockContext scheduled_block() throws RecognitionException {
		Scheduled_blockContext _localctx = new Scheduled_blockContext(_ctx, getState());
		enterRule(_localctx, 2, RULE_scheduled_block);
		int _la;
		try {
			enterOuterAlt(_localctx, 1);
			{
			setState(20);
			scheduled_block_open();
			setState(24);
			_errHandler.sync(this);
			_la = _input.LA(1);
			while ((((_la) & ~0x3f) == 0 && ((1L << _la) & 678L) != 0)) {
				{
				{
				setState(21);
				code();
				}
				}
				setState(26);
				_errHandler.sync(this);
				_la = _input.LA(1);
			}
			setState(27);
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
		public TerminalNode DASH() { return getToken(RoutineParser.DASH, 0); }
		public TerminalNode GT() { return getToken(RoutineParser.GT, 0); }
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
			setState(29);
			match(DASH);
			setState(31);
			_errHandler.sync(this);
			_la = _input.LA(1);
			if (_la==IDENTIFIER) {
				{
				setState(30);
				scheduled_block_flag_list();
				}
			}

			setState(33);
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
		public TerminalNode LT() { return getToken(RoutineParser.LT, 0); }
		public TerminalNode DASH() { return getToken(RoutineParser.DASH, 0); }
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
			setState(35);
			match(LT);
			setState(37);
			_errHandler.sync(this);
			_la = _input.LA(1);
			if (_la==IDENTIFIER) {
				{
				setState(36);
				scheduled_block_flag_list();
				}
			}

			setState(39);
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
		public List<TerminalNode> IDENTIFIER() { return getTokens(RoutineParser.IDENTIFIER); }
		public TerminalNode IDENTIFIER(int i) {
			return getToken(RoutineParser.IDENTIFIER, i);
		}
		public List<TerminalNode> COMMA() { return getTokens(RoutineParser.COMMA); }
		public TerminalNode COMMA(int i) {
			return getToken(RoutineParser.COMMA, i);
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
			setState(41);
			match(IDENTIFIER);
			setState(46);
			_errHandler.sync(this);
			_la = _input.LA(1);
			while (_la==COMMA) {
				{
				{
				setState(42);
				match(COMMA);
				setState(43);
				match(IDENTIFIER);
				}
				}
				setState(48);
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
		public TerminalNode NODE() { return getToken(RoutineParser.NODE, 0); }
		public NodeContext(CodeContext ctx) { copyFrom(ctx); }
	}
	@SuppressWarnings("CheckReturnValue")
	public static class Junk_atContext extends CodeContext {
		public TerminalNode AT() { return getToken(RoutineParser.AT, 0); }
		public Junk_atContext(CodeContext ctx) { copyFrom(ctx); }
	}
	@SuppressWarnings("CheckReturnValue")
	public static class Junk_dashContext extends CodeContext {
		public TerminalNode DASH() { return getToken(RoutineParser.DASH, 0); }
		public Junk_dashContext(CodeContext ctx) { copyFrom(ctx); }
	}
	@SuppressWarnings("CheckReturnValue")
	public static class JunkContext extends CodeContext {
		public TerminalNode JUNK() { return getToken(RoutineParser.JUNK, 0); }
		public JunkContext(CodeContext ctx) { copyFrom(ctx); }
	}
	@SuppressWarnings("CheckReturnValue")
	public static class SignalContext extends CodeContext {
		public TerminalNode SIGNAL() { return getToken(RoutineParser.SIGNAL, 0); }
		public SignalContext(CodeContext ctx) { copyFrom(ctx); }
	}

	public final CodeContext code() throws RecognitionException {
		CodeContext _localctx = new CodeContext(_ctx, getState());
		enterRule(_localctx, 10, RULE_code);
		try {
			setState(54);
			_errHandler.sync(this);
			switch (_input.LA(1)) {
			case NODE:
				_localctx = new NodeContext(_localctx);
				enterOuterAlt(_localctx, 1);
				{
				setState(49);
				match(NODE);
				}
				break;
			case SIGNAL:
				_localctx = new SignalContext(_localctx);
				enterOuterAlt(_localctx, 2);
				{
				setState(50);
				match(SIGNAL);
				}
				break;
			case AT:
				_localctx = new Junk_atContext(_localctx);
				enterOuterAlt(_localctx, 3);
				{
				setState(51);
				match(AT);
				}
				break;
			case DASH:
				_localctx = new Junk_dashContext(_localctx);
				enterOuterAlt(_localctx, 4);
				{
				setState(52);
				match(DASH);
				}
				break;
			case JUNK:
				_localctx = new JunkContext(_localctx);
				enterOuterAlt(_localctx, 5);
				{
				setState(53);
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
		"\u0004\u0001\f9\u0002\u0000\u0007\u0000\u0002\u0001\u0007\u0001\u0002"+
		"\u0002\u0007\u0002\u0002\u0003\u0007\u0003\u0002\u0004\u0007\u0004\u0002"+
		"\u0005\u0007\u0005\u0001\u0000\u0005\u0000\u000e\b\u0000\n\u0000\f\u0000"+
		"\u0011\t\u0000\u0001\u0000\u0001\u0000\u0001\u0001\u0001\u0001\u0005\u0001"+
		"\u0017\b\u0001\n\u0001\f\u0001\u001a\t\u0001\u0001\u0001\u0001\u0001\u0001"+
		"\u0002\u0001\u0002\u0003\u0002 \b\u0002\u0001\u0002\u0001\u0002\u0001"+
		"\u0003\u0001\u0003\u0003\u0003&\b\u0003\u0001\u0003\u0001\u0003\u0001"+
		"\u0004\u0001\u0004\u0001\u0004\u0005\u0004-\b\u0004\n\u0004\f\u00040\t"+
		"\u0004\u0001\u0005\u0001\u0005\u0001\u0005\u0001\u0005\u0001\u0005\u0003"+
		"\u00057\b\u0005\u0001\u0005\u0000\u0000\u0006\u0000\u0002\u0004\u0006"+
		"\b\n\u0000\u0000;\u0000\u000f\u0001\u0000\u0000\u0000\u0002\u0014\u0001"+
		"\u0000\u0000\u0000\u0004\u001d\u0001\u0000\u0000\u0000\u0006#\u0001\u0000"+
		"\u0000\u0000\b)\u0001\u0000\u0000\u0000\n6\u0001\u0000\u0000\u0000\f\u000e"+
		"\u0003\u0002\u0001\u0000\r\f\u0001\u0000\u0000\u0000\u000e\u0011\u0001"+
		"\u0000\u0000\u0000\u000f\r\u0001\u0000\u0000\u0000\u000f\u0010\u0001\u0000"+
		"\u0000\u0000\u0010\u0012\u0001\u0000\u0000\u0000\u0011\u000f\u0001\u0000"+
		"\u0000\u0000\u0012\u0013\u0005\u0000\u0000\u0001\u0013\u0001\u0001\u0000"+
		"\u0000\u0000\u0014\u0018\u0003\u0004\u0002\u0000\u0015\u0017\u0003\n\u0005"+
		"\u0000\u0016\u0015\u0001\u0000\u0000\u0000\u0017\u001a\u0001\u0000\u0000"+
		"\u0000\u0018\u0016\u0001\u0000\u0000\u0000\u0018\u0019\u0001\u0000\u0000"+
		"\u0000\u0019\u001b\u0001\u0000\u0000\u0000\u001a\u0018\u0001\u0000\u0000"+
		"\u0000\u001b\u001c\u0003\u0006\u0003\u0000\u001c\u0003\u0001\u0000\u0000"+
		"\u0000\u001d\u001f\u0005\u0005\u0000\u0000\u001e \u0003\b\u0004\u0000"+
		"\u001f\u001e\u0001\u0000\u0000\u0000\u001f \u0001\u0000\u0000\u0000 !"+
		"\u0001\u0000\u0000\u0000!\"\u0005\u0003\u0000\u0000\"\u0005\u0001\u0000"+
		"\u0000\u0000#%\u0005\u0004\u0000\u0000$&\u0003\b\u0004\u0000%$\u0001\u0000"+
		"\u0000\u0000%&\u0001\u0000\u0000\u0000&\'\u0001\u0000\u0000\u0000\'(\u0005"+
		"\u0005\u0000\u0000(\u0007\u0001\u0000\u0000\u0000).\u0005\b\u0000\u0000"+
		"*+\u0005\u0006\u0000\u0000+-\u0005\b\u0000\u0000,*\u0001\u0000\u0000\u0000"+
		"-0\u0001\u0000\u0000\u0000.,\u0001\u0000\u0000\u0000./\u0001\u0000\u0000"+
		"\u0000/\t\u0001\u0000\u0000\u00000.\u0001\u0000\u0000\u000017\u0005\u0001"+
		"\u0000\u000027\u0005\u0002\u0000\u000037\u0005\u0007\u0000\u000047\u0005"+
		"\u0005\u0000\u000057\u0005\t\u0000\u000061\u0001\u0000\u0000\u000062\u0001"+
		"\u0000\u0000\u000063\u0001\u0000\u0000\u000064\u0001\u0000\u0000\u0000"+
		"65\u0001\u0000\u0000\u00007\u000b\u0001\u0000\u0000\u0000\u0006\u000f"+
		"\u0018\u001f%.6";
	public static final ATN _ATN =
		new ATNDeserializer().deserialize(_serializedATN.toCharArray());
	static {
		_decisionToDFA = new DFA[_ATN.getNumberOfDecisions()];
		for (int i = 0; i < _ATN.getNumberOfDecisions(); i++) {
			_decisionToDFA[i] = new DFA(_ATN.getDecisionState(i), i);
		}
	}
}