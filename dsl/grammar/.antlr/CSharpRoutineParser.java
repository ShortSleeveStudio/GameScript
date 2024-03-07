// Generated from d:/Work/GameScript/dsl/grammar/CSharpRoutineParser.g4 by ANTLR 4.13.1
import org.antlr.v4.runtime.atn.*;
import org.antlr.v4.runtime.dfa.DFA;
import org.antlr.v4.runtime.*;
import org.antlr.v4.runtime.misc.*;
import org.antlr.v4.runtime.tree.*;
import java.util.List;
import java.util.Iterator;
import java.util.ArrayList;

@SuppressWarnings({"all", "warnings", "unchecked", "unused", "cast", "CheckReturnValue"})
public class CSharpRoutineParser extends Parser {
	static { RuntimeMetaData.checkVersion("4.13.1", RuntimeMetaData.VERSION); }

	protected static final DFA[] _decisionToDFA;
	protected static final PredictionContextCache _sharedContextCache =
		new PredictionContextCache();
	public static final int
		TYPE_BOOLEAN=1, TYPE_CHAR=2, TYPE_FLOAT_DEFAULT=3, TYPE_FLOAT32=4, TYPE_FLOAT64=5, 
		TYPE_INT_DEFAULT=6, TYPE_INT8=7, TYPE_INT16=8, TYPE_INT32=9, TYPE_INT64=10, 
		TYPE_UINT_DEFAULT=11, TYPE_UINT8=12, TYPE_UINT16=13, TYPE_UINT32=14, TYPE_UINT64=15, 
		TYPE_STRING=16, NODE=17, SIGNAL=18, BREAK=19, CASE=20, DEFAULT=21, IF=22, 
		ELSE=23, SWITCH=24, INTEGER_LITERAL=25, FLOATING_POINT_LITERAL=26, BOOLEAN_LITERAL=27, 
		CHARACTER_LITERAL=28, STRING_LITERAL=29, NULL_LITERAL=30, LPAREN=31, RPAREN=32, 
		LBRACE=33, RBRACE=34, LBRACK=35, RBRACK=36, SEMI=37, COMMA=38, DOT=39, 
		COLON=40, COLONCOLON=41, ASSIGN=42, ADD_ASSIGN=43, SUB_ASSIGN=44, MUL_ASSIGN=45, 
		DIV_ASSIGN=46, AND_ASSIGN=47, OR_ASSIGN=48, XOR_ASSIGN=49, MOD_ASSIGN=50, 
		LSHIFT_ASSIGN=51, RSHIFT_ASSIGN=52, GT=53, LT=54, EQUAL=55, LE=56, GE=57, 
		NOTEQUAL=58, NOT=59, BIT_NOT=60, BIT_AND=61, BIT_OR=62, BIT_XOR=63, AND=64, 
		OR=65, INC=66, DEC=67, ADD=68, SUB=69, MUL=70, DIV=71, MOD=72, TERNARY=73, 
		IDENTIFIER=74, WHITESPACE=75, COMMENT_BLOCK=76, COMMENT_LINE=77;
	public static final int
		RULE_routine = 0, RULE_scheduled_block = 1, RULE_scheduled_block_open = 2, 
		RULE_scheduled_block_close = 3, RULE_block = 4, RULE_statement = 5, RULE_compound_statement = 6, 
		RULE_statement_list = 7, RULE_expression_statement = 8, RULE_if_statement = 9, 
		RULE_switch_statement = 10, RULE_switch_block = 11, RULE_switch_label = 12, 
		RULE_declaration_statement = 13, RULE_declarator_init = 14, RULE_declarator = 15, 
		RULE_break_statement = 16, RULE_expression_list = 17, RULE_expression = 18, 
		RULE_assignment_operator = 19, RULE_type = 20, RULE_primitive_type = 21, 
		RULE_name = 22, RULE_flag_list = 23, RULE_literal = 24;
	private static String[] makeRuleNames() {
		return new String[] {
			"routine", "scheduled_block", "scheduled_block_open", "scheduled_block_close", 
			"block", "statement", "compound_statement", "statement_list", "expression_statement", 
			"if_statement", "switch_statement", "switch_block", "switch_label", "declaration_statement", 
			"declarator_init", "declarator", "break_statement", "expression_list", 
			"expression", "assignment_operator", "type", "primitive_type", "name", 
			"flag_list", "literal"
		};
	}
	public static final String[] ruleNames = makeRuleNames();

	private static String[] makeLiteralNames() {
		return new String[] {
			null, "'bool'", "'char'", "'float'", "'float32'", "'float64'", "'int'", 
			"'int8'", "'int16'", "'int32'", "'int64'", "'uint'", "'uint8'", "'uint16'", 
			"'uint32'", "'uint64'", "'string'", "'@node'", "'@sig'", "'break'", "'case'", 
			"'default'", "'if'", "'else'", "'switch'", null, null, null, null, null, 
			"'null'", "'('", "')'", "'{'", "'}'", "'['", "']'", "';'", "','", "'.'", 
			"':'", "'::'", "'='", "'+='", "'-='", "'*='", "'/='", "'&='", "'|='", 
			"'^='", "'%='", "'<<='", "'>>='", "'>'", "'<'", "'=='", "'<='", "'>='", 
			"'!='", "'!'", "'~'", "'&'", "'|'", "'^'", "'&&'", "'||'", "'++'", "'--'", 
			"'+'", "'-'", "'*'", "'/'", "'%'", "'?'"
		};
	}
	private static final String[] _LITERAL_NAMES = makeLiteralNames();
	private static String[] makeSymbolicNames() {
		return new String[] {
			null, "TYPE_BOOLEAN", "TYPE_CHAR", "TYPE_FLOAT_DEFAULT", "TYPE_FLOAT32", 
			"TYPE_FLOAT64", "TYPE_INT_DEFAULT", "TYPE_INT8", "TYPE_INT16", "TYPE_INT32", 
			"TYPE_INT64", "TYPE_UINT_DEFAULT", "TYPE_UINT8", "TYPE_UINT16", "TYPE_UINT32", 
			"TYPE_UINT64", "TYPE_STRING", "NODE", "SIGNAL", "BREAK", "CASE", "DEFAULT", 
			"IF", "ELSE", "SWITCH", "INTEGER_LITERAL", "FLOATING_POINT_LITERAL", 
			"BOOLEAN_LITERAL", "CHARACTER_LITERAL", "STRING_LITERAL", "NULL_LITERAL", 
			"LPAREN", "RPAREN", "LBRACE", "RBRACE", "LBRACK", "RBRACK", "SEMI", "COMMA", 
			"DOT", "COLON", "COLONCOLON", "ASSIGN", "ADD_ASSIGN", "SUB_ASSIGN", "MUL_ASSIGN", 
			"DIV_ASSIGN", "AND_ASSIGN", "OR_ASSIGN", "XOR_ASSIGN", "MOD_ASSIGN", 
			"LSHIFT_ASSIGN", "RSHIFT_ASSIGN", "GT", "LT", "EQUAL", "LE", "GE", "NOTEQUAL", 
			"NOT", "BIT_NOT", "BIT_AND", "BIT_OR", "BIT_XOR", "AND", "OR", "INC", 
			"DEC", "ADD", "SUB", "MUL", "DIV", "MOD", "TERNARY", "IDENTIFIER", "WHITESPACE", 
			"COMMENT_BLOCK", "COMMENT_LINE"
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
	public String getGrammarFileName() { return "CSharpRoutineParser.g4"; }

	@Override
	public String[] getRuleNames() { return ruleNames; }

	@Override
	public String getSerializedATN() { return _serializedATN; }

	@Override
	public ATN getATN() { return _ATN; }

	public CSharpRoutineParser(TokenStream input) {
		super(input);
		_interp = new ParserATNSimulator(this,_ATN,_decisionToDFA,_sharedContextCache);
	}

	@SuppressWarnings("CheckReturnValue")
	public static class RoutineContext extends ParserRuleContext {
		public TerminalNode EOF() { return getToken(CSharpRoutineParser.EOF, 0); }
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
			setState(53);
			_errHandler.sync(this);
			_la = _input.LA(1);
			while (_la==LT) {
				{
				{
				setState(50);
				scheduled_block();
				}
				}
				setState(55);
				_errHandler.sync(this);
				_la = _input.LA(1);
			}
			setState(56);
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
		public BlockContext block() {
			return getRuleContext(BlockContext.class,0);
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
			setState(58);
			scheduled_block_open();
			setState(59);
			block();
			setState(60);
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
		public TerminalNode LT() { return getToken(CSharpRoutineParser.LT, 0); }
		public TerminalNode SUB() { return getToken(CSharpRoutineParser.SUB, 0); }
		public Flag_listContext flag_list() {
			return getRuleContext(Flag_listContext.class,0);
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
			setState(62);
			match(LT);
			setState(64);
			_errHandler.sync(this);
			_la = _input.LA(1);
			if (_la==IDENTIFIER) {
				{
				setState(63);
				flag_list();
				}
			}

			setState(66);
			match(SUB);
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
		public TerminalNode SUB() { return getToken(CSharpRoutineParser.SUB, 0); }
		public TerminalNode GT() { return getToken(CSharpRoutineParser.GT, 0); }
		public Flag_listContext flag_list() {
			return getRuleContext(Flag_listContext.class,0);
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
			setState(68);
			match(SUB);
			setState(70);
			_errHandler.sync(this);
			_la = _input.LA(1);
			if (_la==IDENTIFIER) {
				{
				setState(69);
				flag_list();
				}
			}

			setState(72);
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
	public static class BlockContext extends ParserRuleContext {
		public List<StatementContext> statement() {
			return getRuleContexts(StatementContext.class);
		}
		public StatementContext statement(int i) {
			return getRuleContext(StatementContext.class,i);
		}
		public BlockContext(ParserRuleContext parent, int invokingState) {
			super(parent, invokingState);
		}
		@Override public int getRuleIndex() { return RULE_block; }
	}

	public final BlockContext block() throws RecognitionException {
		BlockContext _localctx = new BlockContext(_ctx, getState());
		enterRule(_localctx, 8, RULE_block);
		try {
			int _alt;
			enterOuterAlt(_localctx, 1);
			{
			setState(77);
			_errHandler.sync(this);
			_alt = getInterpreter().adaptivePredict(_input,3,_ctx);
			while ( _alt!=2 && _alt!=org.antlr.v4.runtime.atn.ATN.INVALID_ALT_NUMBER ) {
				if ( _alt==1 ) {
					{
					{
					setState(74);
					statement();
					}
					} 
				}
				setState(79);
				_errHandler.sync(this);
				_alt = getInterpreter().adaptivePredict(_input,3,_ctx);
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
	public static class StatementContext extends ParserRuleContext {
		public If_statementContext if_statement() {
			return getRuleContext(If_statementContext.class,0);
		}
		public Switch_statementContext switch_statement() {
			return getRuleContext(Switch_statementContext.class,0);
		}
		public Compound_statementContext compound_statement() {
			return getRuleContext(Compound_statementContext.class,0);
		}
		public Expression_statementContext expression_statement() {
			return getRuleContext(Expression_statementContext.class,0);
		}
		public Declaration_statementContext declaration_statement() {
			return getRuleContext(Declaration_statementContext.class,0);
		}
		public Break_statementContext break_statement() {
			return getRuleContext(Break_statementContext.class,0);
		}
		public StatementContext(ParserRuleContext parent, int invokingState) {
			super(parent, invokingState);
		}
		@Override public int getRuleIndex() { return RULE_statement; }
	}

	public final StatementContext statement() throws RecognitionException {
		StatementContext _localctx = new StatementContext(_ctx, getState());
		enterRule(_localctx, 10, RULE_statement);
		try {
			setState(86);
			_errHandler.sync(this);
			switch ( getInterpreter().adaptivePredict(_input,4,_ctx) ) {
			case 1:
				enterOuterAlt(_localctx, 1);
				{
				setState(80);
				if_statement();
				}
				break;
			case 2:
				enterOuterAlt(_localctx, 2);
				{
				setState(81);
				switch_statement();
				}
				break;
			case 3:
				enterOuterAlt(_localctx, 3);
				{
				setState(82);
				compound_statement();
				}
				break;
			case 4:
				enterOuterAlt(_localctx, 4);
				{
				setState(83);
				expression_statement();
				}
				break;
			case 5:
				enterOuterAlt(_localctx, 5);
				{
				setState(84);
				declaration_statement();
				}
				break;
			case 6:
				enterOuterAlt(_localctx, 6);
				{
				setState(85);
				break_statement();
				}
				break;
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
	public static class Compound_statementContext extends ParserRuleContext {
		public TerminalNode LBRACE() { return getToken(CSharpRoutineParser.LBRACE, 0); }
		public TerminalNode RBRACE() { return getToken(CSharpRoutineParser.RBRACE, 0); }
		public Statement_listContext statement_list() {
			return getRuleContext(Statement_listContext.class,0);
		}
		public Compound_statementContext(ParserRuleContext parent, int invokingState) {
			super(parent, invokingState);
		}
		@Override public int getRuleIndex() { return RULE_compound_statement; }
	}

	public final Compound_statementContext compound_statement() throws RecognitionException {
		Compound_statementContext _localctx = new Compound_statementContext(_ctx, getState());
		enterRule(_localctx, 12, RULE_compound_statement);
		int _la;
		try {
			enterOuterAlt(_localctx, 1);
			{
			setState(88);
			match(LBRACE);
			setState(90);
			_errHandler.sync(this);
			_la = _input.LA(1);
			if ((((_la) & ~0x3f) == 0 && ((1L << _la) & 1729382269783638014L) != 0) || ((((_la - 66)) & ~0x3f) == 0 && ((1L << (_la - 66)) & 271L) != 0)) {
				{
				setState(89);
				statement_list();
				}
			}

			setState(92);
			match(RBRACE);
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
	public static class Statement_listContext extends ParserRuleContext {
		public List<StatementContext> statement() {
			return getRuleContexts(StatementContext.class);
		}
		public StatementContext statement(int i) {
			return getRuleContext(StatementContext.class,i);
		}
		public Statement_listContext(ParserRuleContext parent, int invokingState) {
			super(parent, invokingState);
		}
		@Override public int getRuleIndex() { return RULE_statement_list; }
	}

	public final Statement_listContext statement_list() throws RecognitionException {
		Statement_listContext _localctx = new Statement_listContext(_ctx, getState());
		enterRule(_localctx, 14, RULE_statement_list);
		int _la;
		try {
			enterOuterAlt(_localctx, 1);
			{
			setState(95); 
			_errHandler.sync(this);
			_la = _input.LA(1);
			do {
				{
				{
				setState(94);
				statement();
				}
				}
				setState(97); 
				_errHandler.sync(this);
				_la = _input.LA(1);
			} while ( (((_la) & ~0x3f) == 0 && ((1L << _la) & 1729382269783638014L) != 0) || ((((_la - 66)) & ~0x3f) == 0 && ((1L << (_la - 66)) & 271L) != 0) );
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
	public static class Expression_statementContext extends ParserRuleContext {
		public ExpressionContext expression() {
			return getRuleContext(ExpressionContext.class,0);
		}
		public TerminalNode SEMI() { return getToken(CSharpRoutineParser.SEMI, 0); }
		public Expression_statementContext(ParserRuleContext parent, int invokingState) {
			super(parent, invokingState);
		}
		@Override public int getRuleIndex() { return RULE_expression_statement; }
	}

	public final Expression_statementContext expression_statement() throws RecognitionException {
		Expression_statementContext _localctx = new Expression_statementContext(_ctx, getState());
		enterRule(_localctx, 16, RULE_expression_statement);
		try {
			enterOuterAlt(_localctx, 1);
			{
			setState(99);
			expression(0);
			setState(100);
			match(SEMI);
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
	public static class If_statementContext extends ParserRuleContext {
		public TerminalNode IF() { return getToken(CSharpRoutineParser.IF, 0); }
		public TerminalNode LPAREN() { return getToken(CSharpRoutineParser.LPAREN, 0); }
		public ExpressionContext expression() {
			return getRuleContext(ExpressionContext.class,0);
		}
		public TerminalNode RPAREN() { return getToken(CSharpRoutineParser.RPAREN, 0); }
		public List<StatementContext> statement() {
			return getRuleContexts(StatementContext.class);
		}
		public StatementContext statement(int i) {
			return getRuleContext(StatementContext.class,i);
		}
		public TerminalNode ELSE() { return getToken(CSharpRoutineParser.ELSE, 0); }
		public If_statementContext(ParserRuleContext parent, int invokingState) {
			super(parent, invokingState);
		}
		@Override public int getRuleIndex() { return RULE_if_statement; }
	}

	public final If_statementContext if_statement() throws RecognitionException {
		If_statementContext _localctx = new If_statementContext(_ctx, getState());
		enterRule(_localctx, 18, RULE_if_statement);
		try {
			enterOuterAlt(_localctx, 1);
			{
			setState(102);
			match(IF);
			setState(103);
			match(LPAREN);
			setState(104);
			expression(0);
			setState(105);
			match(RPAREN);
			setState(106);
			statement();
			setState(109);
			_errHandler.sync(this);
			switch ( getInterpreter().adaptivePredict(_input,7,_ctx) ) {
			case 1:
				{
				setState(107);
				match(ELSE);
				setState(108);
				statement();
				}
				break;
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
	public static class Switch_statementContext extends ParserRuleContext {
		public TerminalNode SWITCH() { return getToken(CSharpRoutineParser.SWITCH, 0); }
		public TerminalNode LPAREN() { return getToken(CSharpRoutineParser.LPAREN, 0); }
		public ExpressionContext expression() {
			return getRuleContext(ExpressionContext.class,0);
		}
		public TerminalNode RPAREN() { return getToken(CSharpRoutineParser.RPAREN, 0); }
		public Switch_blockContext switch_block() {
			return getRuleContext(Switch_blockContext.class,0);
		}
		public Switch_statementContext(ParserRuleContext parent, int invokingState) {
			super(parent, invokingState);
		}
		@Override public int getRuleIndex() { return RULE_switch_statement; }
	}

	public final Switch_statementContext switch_statement() throws RecognitionException {
		Switch_statementContext _localctx = new Switch_statementContext(_ctx, getState());
		enterRule(_localctx, 20, RULE_switch_statement);
		try {
			enterOuterAlt(_localctx, 1);
			{
			setState(111);
			match(SWITCH);
			setState(112);
			match(LPAREN);
			setState(113);
			expression(0);
			setState(114);
			match(RPAREN);
			setState(115);
			switch_block();
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
	public static class Switch_blockContext extends ParserRuleContext {
		public TerminalNode LBRACE() { return getToken(CSharpRoutineParser.LBRACE, 0); }
		public TerminalNode RBRACE() { return getToken(CSharpRoutineParser.RBRACE, 0); }
		public List<Switch_labelContext> switch_label() {
			return getRuleContexts(Switch_labelContext.class);
		}
		public Switch_labelContext switch_label(int i) {
			return getRuleContext(Switch_labelContext.class,i);
		}
		public Switch_blockContext(ParserRuleContext parent, int invokingState) {
			super(parent, invokingState);
		}
		@Override public int getRuleIndex() { return RULE_switch_block; }
	}

	public final Switch_blockContext switch_block() throws RecognitionException {
		Switch_blockContext _localctx = new Switch_blockContext(_ctx, getState());
		enterRule(_localctx, 22, RULE_switch_block);
		int _la;
		try {
			enterOuterAlt(_localctx, 1);
			{
			setState(117);
			match(LBRACE);
			setState(121);
			_errHandler.sync(this);
			_la = _input.LA(1);
			while (_la==CASE || _la==DEFAULT) {
				{
				{
				setState(118);
				switch_label();
				}
				}
				setState(123);
				_errHandler.sync(this);
				_la = _input.LA(1);
			}
			setState(124);
			match(RBRACE);
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
	public static class Switch_labelContext extends ParserRuleContext {
		public TerminalNode CASE() { return getToken(CSharpRoutineParser.CASE, 0); }
		public ExpressionContext expression() {
			return getRuleContext(ExpressionContext.class,0);
		}
		public TerminalNode COLON() { return getToken(CSharpRoutineParser.COLON, 0); }
		public List<StatementContext> statement() {
			return getRuleContexts(StatementContext.class);
		}
		public StatementContext statement(int i) {
			return getRuleContext(StatementContext.class,i);
		}
		public TerminalNode DEFAULT() { return getToken(CSharpRoutineParser.DEFAULT, 0); }
		public Switch_labelContext(ParserRuleContext parent, int invokingState) {
			super(parent, invokingState);
		}
		@Override public int getRuleIndex() { return RULE_switch_label; }
	}

	public final Switch_labelContext switch_label() throws RecognitionException {
		Switch_labelContext _localctx = new Switch_labelContext(_ctx, getState());
		enterRule(_localctx, 24, RULE_switch_label);
		int _la;
		try {
			setState(143);
			_errHandler.sync(this);
			switch (_input.LA(1)) {
			case CASE:
				enterOuterAlt(_localctx, 1);
				{
				setState(126);
				match(CASE);
				setState(127);
				expression(0);
				setState(128);
				match(COLON);
				setState(132);
				_errHandler.sync(this);
				_la = _input.LA(1);
				while ((((_la) & ~0x3f) == 0 && ((1L << _la) & 1729382269783638014L) != 0) || ((((_la - 66)) & ~0x3f) == 0 && ((1L << (_la - 66)) & 271L) != 0)) {
					{
					{
					setState(129);
					statement();
					}
					}
					setState(134);
					_errHandler.sync(this);
					_la = _input.LA(1);
				}
				}
				break;
			case DEFAULT:
				enterOuterAlt(_localctx, 2);
				{
				setState(135);
				match(DEFAULT);
				setState(136);
				match(COLON);
				setState(140);
				_errHandler.sync(this);
				_la = _input.LA(1);
				while ((((_la) & ~0x3f) == 0 && ((1L << _la) & 1729382269783638014L) != 0) || ((((_la - 66)) & ~0x3f) == 0 && ((1L << (_la - 66)) & 271L) != 0)) {
					{
					{
					setState(137);
					statement();
					}
					}
					setState(142);
					_errHandler.sync(this);
					_la = _input.LA(1);
				}
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

	@SuppressWarnings("CheckReturnValue")
	public static class Declaration_statementContext extends ParserRuleContext {
		public TypeContext type() {
			return getRuleContext(TypeContext.class,0);
		}
		public Declarator_initContext declarator_init() {
			return getRuleContext(Declarator_initContext.class,0);
		}
		public TerminalNode SEMI() { return getToken(CSharpRoutineParser.SEMI, 0); }
		public Declaration_statementContext(ParserRuleContext parent, int invokingState) {
			super(parent, invokingState);
		}
		@Override public int getRuleIndex() { return RULE_declaration_statement; }
	}

	public final Declaration_statementContext declaration_statement() throws RecognitionException {
		Declaration_statementContext _localctx = new Declaration_statementContext(_ctx, getState());
		enterRule(_localctx, 26, RULE_declaration_statement);
		try {
			enterOuterAlt(_localctx, 1);
			{
			setState(145);
			type(0);
			setState(146);
			declarator_init();
			setState(147);
			match(SEMI);
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
	public static class Declarator_initContext extends ParserRuleContext {
		public DeclaratorContext declarator() {
			return getRuleContext(DeclaratorContext.class,0);
		}
		public TerminalNode ASSIGN() { return getToken(CSharpRoutineParser.ASSIGN, 0); }
		public ExpressionContext expression() {
			return getRuleContext(ExpressionContext.class,0);
		}
		public Declarator_initContext(ParserRuleContext parent, int invokingState) {
			super(parent, invokingState);
		}
		@Override public int getRuleIndex() { return RULE_declarator_init; }
	}

	public final Declarator_initContext declarator_init() throws RecognitionException {
		Declarator_initContext _localctx = new Declarator_initContext(_ctx, getState());
		enterRule(_localctx, 28, RULE_declarator_init);
		int _la;
		try {
			enterOuterAlt(_localctx, 1);
			{
			setState(149);
			declarator();
			setState(152);
			_errHandler.sync(this);
			_la = _input.LA(1);
			if (_la==ASSIGN) {
				{
				setState(150);
				match(ASSIGN);
				setState(151);
				expression(0);
				}
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
	public static class DeclaratorContext extends ParserRuleContext {
		public TerminalNode IDENTIFIER() { return getToken(CSharpRoutineParser.IDENTIFIER, 0); }
		public DeclaratorContext(ParserRuleContext parent, int invokingState) {
			super(parent, invokingState);
		}
		@Override public int getRuleIndex() { return RULE_declarator; }
	}

	public final DeclaratorContext declarator() throws RecognitionException {
		DeclaratorContext _localctx = new DeclaratorContext(_ctx, getState());
		enterRule(_localctx, 30, RULE_declarator);
		try {
			enterOuterAlt(_localctx, 1);
			{
			setState(154);
			match(IDENTIFIER);
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
	public static class Break_statementContext extends ParserRuleContext {
		public TerminalNode BREAK() { return getToken(CSharpRoutineParser.BREAK, 0); }
		public TerminalNode SEMI() { return getToken(CSharpRoutineParser.SEMI, 0); }
		public Break_statementContext(ParserRuleContext parent, int invokingState) {
			super(parent, invokingState);
		}
		@Override public int getRuleIndex() { return RULE_break_statement; }
	}

	public final Break_statementContext break_statement() throws RecognitionException {
		Break_statementContext _localctx = new Break_statementContext(_ctx, getState());
		enterRule(_localctx, 32, RULE_break_statement);
		try {
			enterOuterAlt(_localctx, 1);
			{
			setState(156);
			match(BREAK);
			setState(157);
			match(SEMI);
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
	public static class Expression_listContext extends ParserRuleContext {
		public List<ExpressionContext> expression() {
			return getRuleContexts(ExpressionContext.class);
		}
		public ExpressionContext expression(int i) {
			return getRuleContext(ExpressionContext.class,i);
		}
		public List<TerminalNode> COMMA() { return getTokens(CSharpRoutineParser.COMMA); }
		public TerminalNode COMMA(int i) {
			return getToken(CSharpRoutineParser.COMMA, i);
		}
		public Expression_listContext(ParserRuleContext parent, int invokingState) {
			super(parent, invokingState);
		}
		@Override public int getRuleIndex() { return RULE_expression_list; }
	}

	public final Expression_listContext expression_list() throws RecognitionException {
		Expression_listContext _localctx = new Expression_listContext(_ctx, getState());
		enterRule(_localctx, 34, RULE_expression_list);
		int _la;
		try {
			enterOuterAlt(_localctx, 1);
			{
			setState(159);
			expression(0);
			setState(164);
			_errHandler.sync(this);
			_la = _input.LA(1);
			while (_la==COMMA) {
				{
				{
				setState(160);
				match(COMMA);
				setState(161);
				expression(0);
				}
				}
				setState(166);
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
	public static class ExpressionContext extends ParserRuleContext {
		public ExpressionContext(ParserRuleContext parent, int invokingState) {
			super(parent, invokingState);
		}
		@Override public int getRuleIndex() { return RULE_expression; }
	 
		public ExpressionContext() { }
		public void copyFrom(ExpressionContext ctx) {
			super.copyFrom(ctx);
		}
	}
	@SuppressWarnings("CheckReturnValue")
	public static class Expression_bitwise_orContext extends ExpressionContext {
		public List<ExpressionContext> expression() {
			return getRuleContexts(ExpressionContext.class);
		}
		public ExpressionContext expression(int i) {
			return getRuleContext(ExpressionContext.class,i);
		}
		public TerminalNode BIT_OR() { return getToken(CSharpRoutineParser.BIT_OR, 0); }
		public Expression_bitwise_orContext(ExpressionContext ctx) { copyFrom(ctx); }
	}
	@SuppressWarnings("CheckReturnValue")
	public static class Expression_bitwise_andContext extends ExpressionContext {
		public List<ExpressionContext> expression() {
			return getRuleContexts(ExpressionContext.class);
		}
		public ExpressionContext expression(int i) {
			return getRuleContext(ExpressionContext.class,i);
		}
		public TerminalNode BIT_AND() { return getToken(CSharpRoutineParser.BIT_AND, 0); }
		public Expression_bitwise_andContext(ExpressionContext ctx) { copyFrom(ctx); }
	}
	@SuppressWarnings("CheckReturnValue")
	public static class Expression_relational_gtContext extends ExpressionContext {
		public List<ExpressionContext> expression() {
			return getRuleContexts(ExpressionContext.class);
		}
		public ExpressionContext expression(int i) {
			return getRuleContext(ExpressionContext.class,i);
		}
		public TerminalNode GT() { return getToken(CSharpRoutineParser.GT, 0); }
		public Expression_relational_gtContext(ExpressionContext ctx) { copyFrom(ctx); }
	}
	@SuppressWarnings("CheckReturnValue")
	public static class Expression_postfix_invokeContext extends ExpressionContext {
		public ExpressionContext expression() {
			return getRuleContext(ExpressionContext.class,0);
		}
		public TerminalNode LPAREN() { return getToken(CSharpRoutineParser.LPAREN, 0); }
		public TerminalNode RPAREN() { return getToken(CSharpRoutineParser.RPAREN, 0); }
		public Expression_listContext expression_list() {
			return getRuleContext(Expression_listContext.class,0);
		}
		public Expression_postfix_invokeContext(ExpressionContext ctx) { copyFrom(ctx); }
	}
	@SuppressWarnings("CheckReturnValue")
	public static class Expression_bitwise_xorContext extends ExpressionContext {
		public List<ExpressionContext> expression() {
			return getRuleContexts(ExpressionContext.class);
		}
		public ExpressionContext expression(int i) {
			return getRuleContext(ExpressionContext.class,i);
		}
		public TerminalNode BIT_XOR() { return getToken(CSharpRoutineParser.BIT_XOR, 0); }
		public Expression_bitwise_xorContext(ExpressionContext ctx) { copyFrom(ctx); }
	}
	@SuppressWarnings("CheckReturnValue")
	public static class Expression_postfix_inc_decContext extends ExpressionContext {
		public ExpressionContext expression() {
			return getRuleContext(ExpressionContext.class,0);
		}
		public TerminalNode INC() { return getToken(CSharpRoutineParser.INC, 0); }
		public TerminalNode DEC() { return getToken(CSharpRoutineParser.DEC, 0); }
		public Expression_postfix_inc_decContext(ExpressionContext ctx) { copyFrom(ctx); }
	}
	@SuppressWarnings("CheckReturnValue")
	public static class Expression_primary_parentheticalContext extends ExpressionContext {
		public TerminalNode LPAREN() { return getToken(CSharpRoutineParser.LPAREN, 0); }
		public ExpressionContext expression() {
			return getRuleContext(ExpressionContext.class,0);
		}
		public TerminalNode RPAREN() { return getToken(CSharpRoutineParser.RPAREN, 0); }
		public Expression_primary_parentheticalContext(ExpressionContext ctx) { copyFrom(ctx); }
	}
	@SuppressWarnings("CheckReturnValue")
	public static class Expression_additive_addContext extends ExpressionContext {
		public List<ExpressionContext> expression() {
			return getRuleContexts(ExpressionContext.class);
		}
		public ExpressionContext expression(int i) {
			return getRuleContext(ExpressionContext.class,i);
		}
		public TerminalNode ADD() { return getToken(CSharpRoutineParser.ADD, 0); }
		public Expression_additive_addContext(ExpressionContext ctx) { copyFrom(ctx); }
	}
	@SuppressWarnings("CheckReturnValue")
	public static class Expression_shift_rightContext extends ExpressionContext {
		public List<ExpressionContext> expression() {
			return getRuleContexts(ExpressionContext.class);
		}
		public ExpressionContext expression(int i) {
			return getRuleContext(ExpressionContext.class,i);
		}
		public List<TerminalNode> GT() { return getTokens(CSharpRoutineParser.GT); }
		public TerminalNode GT(int i) {
			return getToken(CSharpRoutineParser.GT, i);
		}
		public Expression_shift_rightContext(ExpressionContext ctx) { copyFrom(ctx); }
	}
	@SuppressWarnings("CheckReturnValue")
	public static class Expression_ternaryContext extends ExpressionContext {
		public List<ExpressionContext> expression() {
			return getRuleContexts(ExpressionContext.class);
		}
		public ExpressionContext expression(int i) {
			return getRuleContext(ExpressionContext.class,i);
		}
		public TerminalNode TERNARY() { return getToken(CSharpRoutineParser.TERNARY, 0); }
		public TerminalNode COLON() { return getToken(CSharpRoutineParser.COLON, 0); }
		public Expression_ternaryContext(ExpressionContext ctx) { copyFrom(ctx); }
	}
	@SuppressWarnings("CheckReturnValue")
	public static class Expression_equality_not_eqContext extends ExpressionContext {
		public List<ExpressionContext> expression() {
			return getRuleContexts(ExpressionContext.class);
		}
		public ExpressionContext expression(int i) {
			return getRuleContext(ExpressionContext.class,i);
		}
		public TerminalNode NOTEQUAL() { return getToken(CSharpRoutineParser.NOTEQUAL, 0); }
		public Expression_equality_not_eqContext(ExpressionContext ctx) { copyFrom(ctx); }
	}
	@SuppressWarnings("CheckReturnValue")
	public static class Expression_logical_orContext extends ExpressionContext {
		public List<ExpressionContext> expression() {
			return getRuleContexts(ExpressionContext.class);
		}
		public ExpressionContext expression(int i) {
			return getRuleContext(ExpressionContext.class,i);
		}
		public TerminalNode OR() { return getToken(CSharpRoutineParser.OR, 0); }
		public Expression_logical_orContext(ExpressionContext ctx) { copyFrom(ctx); }
	}
	@SuppressWarnings("CheckReturnValue")
	public static class Expression_primary_literalContext extends ExpressionContext {
		public LiteralContext literal() {
			return getRuleContext(LiteralContext.class,0);
		}
		public Expression_primary_literalContext(ExpressionContext ctx) { copyFrom(ctx); }
	}
	@SuppressWarnings("CheckReturnValue")
	public static class Expression_relational_geContext extends ExpressionContext {
		public List<ExpressionContext> expression() {
			return getRuleContexts(ExpressionContext.class);
		}
		public ExpressionContext expression(int i) {
			return getRuleContext(ExpressionContext.class,i);
		}
		public TerminalNode GE() { return getToken(CSharpRoutineParser.GE, 0); }
		public Expression_relational_geContext(ExpressionContext ctx) { copyFrom(ctx); }
	}
	@SuppressWarnings("CheckReturnValue")
	public static class Expression_shift_leftContext extends ExpressionContext {
		public List<ExpressionContext> expression() {
			return getRuleContexts(ExpressionContext.class);
		}
		public ExpressionContext expression(int i) {
			return getRuleContext(ExpressionContext.class,i);
		}
		public List<TerminalNode> LT() { return getTokens(CSharpRoutineParser.LT); }
		public TerminalNode LT(int i) {
			return getToken(CSharpRoutineParser.LT, i);
		}
		public Expression_shift_leftContext(ExpressionContext ctx) { copyFrom(ctx); }
	}
	@SuppressWarnings("CheckReturnValue")
	public static class Expression_equality_eqContext extends ExpressionContext {
		public List<ExpressionContext> expression() {
			return getRuleContexts(ExpressionContext.class);
		}
		public ExpressionContext expression(int i) {
			return getRuleContext(ExpressionContext.class,i);
		}
		public TerminalNode EQUAL() { return getToken(CSharpRoutineParser.EQUAL, 0); }
		public Expression_equality_eqContext(ExpressionContext ctx) { copyFrom(ctx); }
	}
	@SuppressWarnings("CheckReturnValue")
	public static class Expression_primary_nameContext extends ExpressionContext {
		public NameContext name() {
			return getRuleContext(NameContext.class,0);
		}
		public Expression_primary_nameContext(ExpressionContext ctx) { copyFrom(ctx); }
	}
	@SuppressWarnings("CheckReturnValue")
	public static class Expression_assignmentContext extends ExpressionContext {
		public List<ExpressionContext> expression() {
			return getRuleContexts(ExpressionContext.class);
		}
		public ExpressionContext expression(int i) {
			return getRuleContext(ExpressionContext.class,i);
		}
		public Assignment_operatorContext assignment_operator() {
			return getRuleContext(Assignment_operatorContext.class,0);
		}
		public Expression_assignmentContext(ExpressionContext ctx) { copyFrom(ctx); }
	}
	@SuppressWarnings("CheckReturnValue")
	public static class Expression_relational_ltContext extends ExpressionContext {
		public List<ExpressionContext> expression() {
			return getRuleContexts(ExpressionContext.class);
		}
		public ExpressionContext expression(int i) {
			return getRuleContext(ExpressionContext.class,i);
		}
		public TerminalNode LT() { return getToken(CSharpRoutineParser.LT, 0); }
		public Expression_relational_ltContext(ExpressionContext ctx) { copyFrom(ctx); }
	}
	@SuppressWarnings("CheckReturnValue")
	public static class Expression_unaryContext extends ExpressionContext {
		public ExpressionContext expression() {
			return getRuleContext(ExpressionContext.class,0);
		}
		public TerminalNode SUB() { return getToken(CSharpRoutineParser.SUB, 0); }
		public TerminalNode ADD() { return getToken(CSharpRoutineParser.ADD, 0); }
		public TerminalNode NOT() { return getToken(CSharpRoutineParser.NOT, 0); }
		public TerminalNode BIT_NOT() { return getToken(CSharpRoutineParser.BIT_NOT, 0); }
		public TerminalNode DEC() { return getToken(CSharpRoutineParser.DEC, 0); }
		public TerminalNode INC() { return getToken(CSharpRoutineParser.INC, 0); }
		public TerminalNode LPAREN() { return getToken(CSharpRoutineParser.LPAREN, 0); }
		public TypeContext type() {
			return getRuleContext(TypeContext.class,0);
		}
		public TerminalNode RPAREN() { return getToken(CSharpRoutineParser.RPAREN, 0); }
		public Expression_unaryContext(ExpressionContext ctx) { copyFrom(ctx); }
	}
	@SuppressWarnings("CheckReturnValue")
	public static class Expression_additive_subContext extends ExpressionContext {
		public List<ExpressionContext> expression() {
			return getRuleContexts(ExpressionContext.class);
		}
		public ExpressionContext expression(int i) {
			return getRuleContext(ExpressionContext.class,i);
		}
		public TerminalNode SUB() { return getToken(CSharpRoutineParser.SUB, 0); }
		public Expression_additive_subContext(ExpressionContext ctx) { copyFrom(ctx); }
	}
	@SuppressWarnings("CheckReturnValue")
	public static class Expression_multiplicative_divContext extends ExpressionContext {
		public List<ExpressionContext> expression() {
			return getRuleContexts(ExpressionContext.class);
		}
		public ExpressionContext expression(int i) {
			return getRuleContext(ExpressionContext.class,i);
		}
		public TerminalNode DIV() { return getToken(CSharpRoutineParser.DIV, 0); }
		public Expression_multiplicative_divContext(ExpressionContext ctx) { copyFrom(ctx); }
	}
	@SuppressWarnings("CheckReturnValue")
	public static class Expression_postfix_array_accessContext extends ExpressionContext {
		public List<ExpressionContext> expression() {
			return getRuleContexts(ExpressionContext.class);
		}
		public ExpressionContext expression(int i) {
			return getRuleContext(ExpressionContext.class,i);
		}
		public TerminalNode LBRACK() { return getToken(CSharpRoutineParser.LBRACK, 0); }
		public TerminalNode RBRACK() { return getToken(CSharpRoutineParser.RBRACK, 0); }
		public Expression_postfix_array_accessContext(ExpressionContext ctx) { copyFrom(ctx); }
	}
	@SuppressWarnings("CheckReturnValue")
	public static class Expression_logical_andContext extends ExpressionContext {
		public List<ExpressionContext> expression() {
			return getRuleContexts(ExpressionContext.class);
		}
		public ExpressionContext expression(int i) {
			return getRuleContext(ExpressionContext.class,i);
		}
		public TerminalNode AND() { return getToken(CSharpRoutineParser.AND, 0); }
		public Expression_logical_andContext(ExpressionContext ctx) { copyFrom(ctx); }
	}
	@SuppressWarnings("CheckReturnValue")
	public static class Expression_multiplicative_mulContext extends ExpressionContext {
		public List<ExpressionContext> expression() {
			return getRuleContexts(ExpressionContext.class);
		}
		public ExpressionContext expression(int i) {
			return getRuleContext(ExpressionContext.class,i);
		}
		public TerminalNode MUL() { return getToken(CSharpRoutineParser.MUL, 0); }
		public Expression_multiplicative_mulContext(ExpressionContext ctx) { copyFrom(ctx); }
	}
	@SuppressWarnings("CheckReturnValue")
	public static class Expression_multiplicative_modContext extends ExpressionContext {
		public List<ExpressionContext> expression() {
			return getRuleContexts(ExpressionContext.class);
		}
		public ExpressionContext expression(int i) {
			return getRuleContext(ExpressionContext.class,i);
		}
		public TerminalNode MOD() { return getToken(CSharpRoutineParser.MOD, 0); }
		public Expression_multiplicative_modContext(ExpressionContext ctx) { copyFrom(ctx); }
	}
	@SuppressWarnings("CheckReturnValue")
	public static class Expression_relational_leContext extends ExpressionContext {
		public List<ExpressionContext> expression() {
			return getRuleContexts(ExpressionContext.class);
		}
		public ExpressionContext expression(int i) {
			return getRuleContext(ExpressionContext.class,i);
		}
		public TerminalNode LE() { return getToken(CSharpRoutineParser.LE, 0); }
		public Expression_relational_leContext(ExpressionContext ctx) { copyFrom(ctx); }
	}

	public final ExpressionContext expression() throws RecognitionException {
		return expression(0);
	}

	private ExpressionContext expression(int _p) throws RecognitionException {
		ParserRuleContext _parentctx = _ctx;
		int _parentState = getState();
		ExpressionContext _localctx = new ExpressionContext(_ctx, _parentState);
		ExpressionContext _prevctx = _localctx;
		int _startState = 36;
		enterRecursionRule(_localctx, 36, RULE_expression, _p);
		int _la;
		try {
			int _alt;
			enterOuterAlt(_localctx, 1);
			{
			setState(187);
			_errHandler.sync(this);
			switch ( getInterpreter().adaptivePredict(_input,15,_ctx) ) {
			case 1:
				{
				_localctx = new Expression_primary_nameContext(_localctx);
				_ctx = _localctx;
				_prevctx = _localctx;

				setState(168);
				name();
				}
				break;
			case 2:
				{
				_localctx = new Expression_primary_literalContext(_localctx);
				_ctx = _localctx;
				_prevctx = _localctx;
				setState(169);
				literal();
				}
				break;
			case 3:
				{
				_localctx = new Expression_primary_parentheticalContext(_localctx);
				_ctx = _localctx;
				_prevctx = _localctx;
				setState(170);
				match(LPAREN);
				setState(171);
				expression(0);
				setState(172);
				match(RPAREN);
				}
				break;
			case 4:
				{
				_localctx = new Expression_unaryContext(_localctx);
				_ctx = _localctx;
				_prevctx = _localctx;
				setState(184);
				_errHandler.sync(this);
				switch (_input.LA(1)) {
				case SUB:
					{
					setState(174);
					match(SUB);
					}
					break;
				case ADD:
					{
					setState(175);
					match(ADD);
					}
					break;
				case NOT:
					{
					setState(176);
					match(NOT);
					}
					break;
				case BIT_NOT:
					{
					setState(177);
					match(BIT_NOT);
					}
					break;
				case DEC:
					{
					setState(178);
					match(DEC);
					}
					break;
				case INC:
					{
					setState(179);
					match(INC);
					}
					break;
				case LPAREN:
					{
					setState(180);
					match(LPAREN);
					setState(181);
					type(0);
					setState(182);
					match(RPAREN);
					}
					break;
				default:
					throw new NoViableAltException(this);
				}
				setState(186);
				expression(21);
				}
				break;
			}
			_ctx.stop = _input.LT(-1);
			setState(270);
			_errHandler.sync(this);
			_alt = getInterpreter().adaptivePredict(_input,18,_ctx);
			while ( _alt!=2 && _alt!=org.antlr.v4.runtime.atn.ATN.INVALID_ALT_NUMBER ) {
				if ( _alt==1 ) {
					if ( _parseListeners!=null ) triggerExitRuleEvent();
					_prevctx = _localctx;
					{
					setState(268);
					_errHandler.sync(this);
					switch ( getInterpreter().adaptivePredict(_input,17,_ctx) ) {
					case 1:
						{
						_localctx = new Expression_multiplicative_mulContext(new ExpressionContext(_parentctx, _parentState));
						pushNewRecursionContext(_localctx, _startState, RULE_expression);
						setState(189);
						if (!(precpred(_ctx, 20))) throw new FailedPredicateException(this, "precpred(_ctx, 20)");
						setState(190);
						match(MUL);
						setState(191);
						expression(21);
						}
						break;
					case 2:
						{
						_localctx = new Expression_multiplicative_divContext(new ExpressionContext(_parentctx, _parentState));
						pushNewRecursionContext(_localctx, _startState, RULE_expression);
						setState(192);
						if (!(precpred(_ctx, 19))) throw new FailedPredicateException(this, "precpred(_ctx, 19)");
						setState(193);
						match(DIV);
						setState(194);
						expression(20);
						}
						break;
					case 3:
						{
						_localctx = new Expression_multiplicative_modContext(new ExpressionContext(_parentctx, _parentState));
						pushNewRecursionContext(_localctx, _startState, RULE_expression);
						setState(195);
						if (!(precpred(_ctx, 18))) throw new FailedPredicateException(this, "precpred(_ctx, 18)");
						setState(196);
						match(MOD);
						setState(197);
						expression(19);
						}
						break;
					case 4:
						{
						_localctx = new Expression_additive_addContext(new ExpressionContext(_parentctx, _parentState));
						pushNewRecursionContext(_localctx, _startState, RULE_expression);
						setState(198);
						if (!(precpred(_ctx, 17))) throw new FailedPredicateException(this, "precpred(_ctx, 17)");
						setState(199);
						match(ADD);
						setState(200);
						expression(18);
						}
						break;
					case 5:
						{
						_localctx = new Expression_additive_subContext(new ExpressionContext(_parentctx, _parentState));
						pushNewRecursionContext(_localctx, _startState, RULE_expression);
						setState(201);
						if (!(precpred(_ctx, 16))) throw new FailedPredicateException(this, "precpred(_ctx, 16)");
						setState(202);
						match(SUB);
						setState(203);
						expression(17);
						}
						break;
					case 6:
						{
						_localctx = new Expression_shift_leftContext(new ExpressionContext(_parentctx, _parentState));
						pushNewRecursionContext(_localctx, _startState, RULE_expression);
						setState(204);
						if (!(precpred(_ctx, 15))) throw new FailedPredicateException(this, "precpred(_ctx, 15)");
						setState(205);
						match(LT);
						setState(206);
						match(LT);
						setState(207);
						expression(16);
						}
						break;
					case 7:
						{
						_localctx = new Expression_shift_rightContext(new ExpressionContext(_parentctx, _parentState));
						pushNewRecursionContext(_localctx, _startState, RULE_expression);
						setState(208);
						if (!(precpred(_ctx, 14))) throw new FailedPredicateException(this, "precpred(_ctx, 14)");
						setState(209);
						match(GT);
						setState(210);
						match(GT);
						setState(211);
						expression(15);
						}
						break;
					case 8:
						{
						_localctx = new Expression_relational_ltContext(new ExpressionContext(_parentctx, _parentState));
						pushNewRecursionContext(_localctx, _startState, RULE_expression);
						setState(212);
						if (!(precpred(_ctx, 13))) throw new FailedPredicateException(this, "precpred(_ctx, 13)");
						setState(213);
						match(LT);
						setState(214);
						expression(14);
						}
						break;
					case 9:
						{
						_localctx = new Expression_relational_gtContext(new ExpressionContext(_parentctx, _parentState));
						pushNewRecursionContext(_localctx, _startState, RULE_expression);
						setState(215);
						if (!(precpred(_ctx, 12))) throw new FailedPredicateException(this, "precpred(_ctx, 12)");
						setState(216);
						match(GT);
						setState(217);
						expression(13);
						}
						break;
					case 10:
						{
						_localctx = new Expression_relational_leContext(new ExpressionContext(_parentctx, _parentState));
						pushNewRecursionContext(_localctx, _startState, RULE_expression);
						setState(218);
						if (!(precpred(_ctx, 11))) throw new FailedPredicateException(this, "precpred(_ctx, 11)");
						setState(219);
						match(LE);
						setState(220);
						expression(12);
						}
						break;
					case 11:
						{
						_localctx = new Expression_relational_geContext(new ExpressionContext(_parentctx, _parentState));
						pushNewRecursionContext(_localctx, _startState, RULE_expression);
						setState(221);
						if (!(precpred(_ctx, 10))) throw new FailedPredicateException(this, "precpred(_ctx, 10)");
						setState(222);
						match(GE);
						setState(223);
						expression(11);
						}
						break;
					case 12:
						{
						_localctx = new Expression_equality_eqContext(new ExpressionContext(_parentctx, _parentState));
						pushNewRecursionContext(_localctx, _startState, RULE_expression);
						setState(224);
						if (!(precpred(_ctx, 9))) throw new FailedPredicateException(this, "precpred(_ctx, 9)");
						setState(225);
						match(EQUAL);
						setState(226);
						expression(10);
						}
						break;
					case 13:
						{
						_localctx = new Expression_equality_not_eqContext(new ExpressionContext(_parentctx, _parentState));
						pushNewRecursionContext(_localctx, _startState, RULE_expression);
						setState(227);
						if (!(precpred(_ctx, 8))) throw new FailedPredicateException(this, "precpred(_ctx, 8)");
						setState(228);
						match(NOTEQUAL);
						setState(229);
						expression(9);
						}
						break;
					case 14:
						{
						_localctx = new Expression_bitwise_andContext(new ExpressionContext(_parentctx, _parentState));
						pushNewRecursionContext(_localctx, _startState, RULE_expression);
						setState(230);
						if (!(precpred(_ctx, 7))) throw new FailedPredicateException(this, "precpred(_ctx, 7)");
						setState(231);
						match(BIT_AND);
						setState(232);
						expression(8);
						}
						break;
					case 15:
						{
						_localctx = new Expression_bitwise_orContext(new ExpressionContext(_parentctx, _parentState));
						pushNewRecursionContext(_localctx, _startState, RULE_expression);
						setState(233);
						if (!(precpred(_ctx, 6))) throw new FailedPredicateException(this, "precpred(_ctx, 6)");
						setState(234);
						match(BIT_OR);
						setState(235);
						expression(7);
						}
						break;
					case 16:
						{
						_localctx = new Expression_bitwise_xorContext(new ExpressionContext(_parentctx, _parentState));
						pushNewRecursionContext(_localctx, _startState, RULE_expression);
						setState(236);
						if (!(precpred(_ctx, 5))) throw new FailedPredicateException(this, "precpred(_ctx, 5)");
						setState(237);
						match(BIT_XOR);
						setState(238);
						expression(6);
						}
						break;
					case 17:
						{
						_localctx = new Expression_logical_andContext(new ExpressionContext(_parentctx, _parentState));
						pushNewRecursionContext(_localctx, _startState, RULE_expression);
						setState(239);
						if (!(precpred(_ctx, 4))) throw new FailedPredicateException(this, "precpred(_ctx, 4)");
						setState(240);
						match(AND);
						setState(241);
						expression(5);
						}
						break;
					case 18:
						{
						_localctx = new Expression_logical_orContext(new ExpressionContext(_parentctx, _parentState));
						pushNewRecursionContext(_localctx, _startState, RULE_expression);
						setState(242);
						if (!(precpred(_ctx, 3))) throw new FailedPredicateException(this, "precpred(_ctx, 3)");
						setState(243);
						match(OR);
						setState(244);
						expression(4);
						}
						break;
					case 19:
						{
						_localctx = new Expression_ternaryContext(new ExpressionContext(_parentctx, _parentState));
						pushNewRecursionContext(_localctx, _startState, RULE_expression);
						setState(245);
						if (!(precpred(_ctx, 2))) throw new FailedPredicateException(this, "precpred(_ctx, 2)");
						setState(246);
						match(TERNARY);
						setState(247);
						expression(0);
						setState(248);
						match(COLON);
						setState(249);
						expression(2);
						}
						break;
					case 20:
						{
						_localctx = new Expression_assignmentContext(new ExpressionContext(_parentctx, _parentState));
						pushNewRecursionContext(_localctx, _startState, RULE_expression);
						setState(251);
						if (!(precpred(_ctx, 1))) throw new FailedPredicateException(this, "precpred(_ctx, 1)");
						setState(252);
						assignment_operator();
						setState(253);
						expression(2);
						}
						break;
					case 21:
						{
						_localctx = new Expression_postfix_inc_decContext(new ExpressionContext(_parentctx, _parentState));
						pushNewRecursionContext(_localctx, _startState, RULE_expression);
						setState(255);
						if (!(precpred(_ctx, 24))) throw new FailedPredicateException(this, "precpred(_ctx, 24)");
						setState(256);
						_la = _input.LA(1);
						if ( !(_la==INC || _la==DEC) ) {
						_errHandler.recoverInline(this);
						}
						else {
							if ( _input.LA(1)==Token.EOF ) matchedEOF = true;
							_errHandler.reportMatch(this);
							consume();
						}
						}
						break;
					case 22:
						{
						_localctx = new Expression_postfix_array_accessContext(new ExpressionContext(_parentctx, _parentState));
						pushNewRecursionContext(_localctx, _startState, RULE_expression);
						setState(257);
						if (!(precpred(_ctx, 23))) throw new FailedPredicateException(this, "precpred(_ctx, 23)");
						setState(258);
						match(LBRACK);
						setState(259);
						expression(0);
						setState(260);
						match(RBRACK);
						}
						break;
					case 23:
						{
						_localctx = new Expression_postfix_invokeContext(new ExpressionContext(_parentctx, _parentState));
						pushNewRecursionContext(_localctx, _startState, RULE_expression);
						setState(262);
						if (!(precpred(_ctx, 22))) throw new FailedPredicateException(this, "precpred(_ctx, 22)");
						setState(263);
						match(LPAREN);
						setState(265);
						_errHandler.sync(this);
						_la = _input.LA(1);
						if (((((_la - 17)) & ~0x3f) == 0 && ((1L << (_la - 17)) & 152572631516741379L) != 0)) {
							{
							setState(264);
							expression_list();
							}
						}

						setState(267);
						match(RPAREN);
						}
						break;
					}
					} 
				}
				setState(272);
				_errHandler.sync(this);
				_alt = getInterpreter().adaptivePredict(_input,18,_ctx);
			}
			}
		}
		catch (RecognitionException re) {
			_localctx.exception = re;
			_errHandler.reportError(this, re);
			_errHandler.recover(this, re);
		}
		finally {
			unrollRecursionContexts(_parentctx);
		}
		return _localctx;
	}

	@SuppressWarnings("CheckReturnValue")
	public static class Assignment_operatorContext extends ParserRuleContext {
		public TerminalNode ASSIGN() { return getToken(CSharpRoutineParser.ASSIGN, 0); }
		public TerminalNode ADD_ASSIGN() { return getToken(CSharpRoutineParser.ADD_ASSIGN, 0); }
		public TerminalNode SUB_ASSIGN() { return getToken(CSharpRoutineParser.SUB_ASSIGN, 0); }
		public TerminalNode MUL_ASSIGN() { return getToken(CSharpRoutineParser.MUL_ASSIGN, 0); }
		public TerminalNode DIV_ASSIGN() { return getToken(CSharpRoutineParser.DIV_ASSIGN, 0); }
		public TerminalNode AND_ASSIGN() { return getToken(CSharpRoutineParser.AND_ASSIGN, 0); }
		public TerminalNode OR_ASSIGN() { return getToken(CSharpRoutineParser.OR_ASSIGN, 0); }
		public TerminalNode XOR_ASSIGN() { return getToken(CSharpRoutineParser.XOR_ASSIGN, 0); }
		public TerminalNode MOD_ASSIGN() { return getToken(CSharpRoutineParser.MOD_ASSIGN, 0); }
		public TerminalNode LSHIFT_ASSIGN() { return getToken(CSharpRoutineParser.LSHIFT_ASSIGN, 0); }
		public TerminalNode RSHIFT_ASSIGN() { return getToken(CSharpRoutineParser.RSHIFT_ASSIGN, 0); }
		public Assignment_operatorContext(ParserRuleContext parent, int invokingState) {
			super(parent, invokingState);
		}
		@Override public int getRuleIndex() { return RULE_assignment_operator; }
	}

	public final Assignment_operatorContext assignment_operator() throws RecognitionException {
		Assignment_operatorContext _localctx = new Assignment_operatorContext(_ctx, getState());
		enterRule(_localctx, 38, RULE_assignment_operator);
		int _la;
		try {
			enterOuterAlt(_localctx, 1);
			{
			setState(273);
			_la = _input.LA(1);
			if ( !((((_la) & ~0x3f) == 0 && ((1L << _la) & 9002801208229888L) != 0)) ) {
			_errHandler.recoverInline(this);
			}
			else {
				if ( _input.LA(1)==Token.EOF ) matchedEOF = true;
				_errHandler.reportMatch(this);
				consume();
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
	public static class TypeContext extends ParserRuleContext {
		public Primitive_typeContext primitive_type() {
			return getRuleContext(Primitive_typeContext.class,0);
		}
		public NameContext name() {
			return getRuleContext(NameContext.class,0);
		}
		public TerminalNode LT() { return getToken(CSharpRoutineParser.LT, 0); }
		public List<TypeContext> type() {
			return getRuleContexts(TypeContext.class);
		}
		public TypeContext type(int i) {
			return getRuleContext(TypeContext.class,i);
		}
		public TerminalNode GT() { return getToken(CSharpRoutineParser.GT, 0); }
		public List<TerminalNode> COMMA() { return getTokens(CSharpRoutineParser.COMMA); }
		public TerminalNode COMMA(int i) {
			return getToken(CSharpRoutineParser.COMMA, i);
		}
		public TerminalNode LBRACK() { return getToken(CSharpRoutineParser.LBRACK, 0); }
		public TerminalNode RBRACK() { return getToken(CSharpRoutineParser.RBRACK, 0); }
		public TypeContext(ParserRuleContext parent, int invokingState) {
			super(parent, invokingState);
		}
		@Override public int getRuleIndex() { return RULE_type; }
	}

	public final TypeContext type() throws RecognitionException {
		return type(0);
	}

	private TypeContext type(int _p) throws RecognitionException {
		ParserRuleContext _parentctx = _ctx;
		int _parentState = getState();
		TypeContext _localctx = new TypeContext(_ctx, _parentState);
		TypeContext _prevctx = _localctx;
		int _startState = 40;
		enterRecursionRule(_localctx, 40, RULE_type, _p);
		int _la;
		try {
			int _alt;
			enterOuterAlt(_localctx, 1);
			{
			setState(291);
			_errHandler.sync(this);
			switch (_input.LA(1)) {
			case TYPE_BOOLEAN:
			case TYPE_CHAR:
			case TYPE_FLOAT_DEFAULT:
			case TYPE_FLOAT32:
			case TYPE_FLOAT64:
			case TYPE_INT_DEFAULT:
			case TYPE_INT8:
			case TYPE_INT16:
			case TYPE_INT32:
			case TYPE_INT64:
			case TYPE_UINT_DEFAULT:
			case TYPE_UINT8:
			case TYPE_UINT16:
			case TYPE_UINT32:
			case TYPE_UINT64:
			case TYPE_STRING:
				{
				setState(276);
				primitive_type();
				}
				break;
			case IDENTIFIER:
				{
				setState(277);
				name();
				setState(289);
				_errHandler.sync(this);
				switch ( getInterpreter().adaptivePredict(_input,20,_ctx) ) {
				case 1:
					{
					setState(278);
					match(LT);
					setState(279);
					type(0);
					setState(284);
					_errHandler.sync(this);
					_la = _input.LA(1);
					while (_la==COMMA) {
						{
						{
						setState(280);
						match(COMMA);
						setState(281);
						type(0);
						}
						}
						setState(286);
						_errHandler.sync(this);
						_la = _input.LA(1);
					}
					setState(287);
					match(GT);
					}
					break;
				}
				}
				break;
			default:
				throw new NoViableAltException(this);
			}
			_ctx.stop = _input.LT(-1);
			setState(298);
			_errHandler.sync(this);
			_alt = getInterpreter().adaptivePredict(_input,22,_ctx);
			while ( _alt!=2 && _alt!=org.antlr.v4.runtime.atn.ATN.INVALID_ALT_NUMBER ) {
				if ( _alt==1 ) {
					if ( _parseListeners!=null ) triggerExitRuleEvent();
					_prevctx = _localctx;
					{
					{
					_localctx = new TypeContext(_parentctx, _parentState);
					pushNewRecursionContext(_localctx, _startState, RULE_type);
					setState(293);
					if (!(precpred(_ctx, 2))) throw new FailedPredicateException(this, "precpred(_ctx, 2)");
					setState(294);
					match(LBRACK);
					setState(295);
					match(RBRACK);
					}
					} 
				}
				setState(300);
				_errHandler.sync(this);
				_alt = getInterpreter().adaptivePredict(_input,22,_ctx);
			}
			}
		}
		catch (RecognitionException re) {
			_localctx.exception = re;
			_errHandler.reportError(this, re);
			_errHandler.recover(this, re);
		}
		finally {
			unrollRecursionContexts(_parentctx);
		}
		return _localctx;
	}

	@SuppressWarnings("CheckReturnValue")
	public static class Primitive_typeContext extends ParserRuleContext {
		public TerminalNode TYPE_BOOLEAN() { return getToken(CSharpRoutineParser.TYPE_BOOLEAN, 0); }
		public TerminalNode TYPE_CHAR() { return getToken(CSharpRoutineParser.TYPE_CHAR, 0); }
		public TerminalNode TYPE_FLOAT_DEFAULT() { return getToken(CSharpRoutineParser.TYPE_FLOAT_DEFAULT, 0); }
		public TerminalNode TYPE_FLOAT32() { return getToken(CSharpRoutineParser.TYPE_FLOAT32, 0); }
		public TerminalNode TYPE_FLOAT64() { return getToken(CSharpRoutineParser.TYPE_FLOAT64, 0); }
		public TerminalNode TYPE_INT_DEFAULT() { return getToken(CSharpRoutineParser.TYPE_INT_DEFAULT, 0); }
		public TerminalNode TYPE_INT8() { return getToken(CSharpRoutineParser.TYPE_INT8, 0); }
		public TerminalNode TYPE_INT16() { return getToken(CSharpRoutineParser.TYPE_INT16, 0); }
		public TerminalNode TYPE_INT32() { return getToken(CSharpRoutineParser.TYPE_INT32, 0); }
		public TerminalNode TYPE_INT64() { return getToken(CSharpRoutineParser.TYPE_INT64, 0); }
		public TerminalNode TYPE_UINT_DEFAULT() { return getToken(CSharpRoutineParser.TYPE_UINT_DEFAULT, 0); }
		public TerminalNode TYPE_UINT8() { return getToken(CSharpRoutineParser.TYPE_UINT8, 0); }
		public TerminalNode TYPE_UINT16() { return getToken(CSharpRoutineParser.TYPE_UINT16, 0); }
		public TerminalNode TYPE_UINT32() { return getToken(CSharpRoutineParser.TYPE_UINT32, 0); }
		public TerminalNode TYPE_UINT64() { return getToken(CSharpRoutineParser.TYPE_UINT64, 0); }
		public TerminalNode TYPE_STRING() { return getToken(CSharpRoutineParser.TYPE_STRING, 0); }
		public Primitive_typeContext(ParserRuleContext parent, int invokingState) {
			super(parent, invokingState);
		}
		@Override public int getRuleIndex() { return RULE_primitive_type; }
	}

	public final Primitive_typeContext primitive_type() throws RecognitionException {
		Primitive_typeContext _localctx = new Primitive_typeContext(_ctx, getState());
		enterRule(_localctx, 42, RULE_primitive_type);
		int _la;
		try {
			enterOuterAlt(_localctx, 1);
			{
			setState(301);
			_la = _input.LA(1);
			if ( !((((_la) & ~0x3f) == 0 && ((1L << _la) & 131070L) != 0)) ) {
			_errHandler.recoverInline(this);
			}
			else {
				if ( _input.LA(1)==Token.EOF ) matchedEOF = true;
				_errHandler.reportMatch(this);
				consume();
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
	public static class NameContext extends ParserRuleContext {
		public List<TerminalNode> IDENTIFIER() { return getTokens(CSharpRoutineParser.IDENTIFIER); }
		public TerminalNode IDENTIFIER(int i) {
			return getToken(CSharpRoutineParser.IDENTIFIER, i);
		}
		public List<TerminalNode> DOT() { return getTokens(CSharpRoutineParser.DOT); }
		public TerminalNode DOT(int i) {
			return getToken(CSharpRoutineParser.DOT, i);
		}
		public NameContext(ParserRuleContext parent, int invokingState) {
			super(parent, invokingState);
		}
		@Override public int getRuleIndex() { return RULE_name; }
	}

	public final NameContext name() throws RecognitionException {
		NameContext _localctx = new NameContext(_ctx, getState());
		enterRule(_localctx, 44, RULE_name);
		try {
			int _alt;
			enterOuterAlt(_localctx, 1);
			{
			setState(303);
			match(IDENTIFIER);
			setState(308);
			_errHandler.sync(this);
			_alt = getInterpreter().adaptivePredict(_input,23,_ctx);
			while ( _alt!=2 && _alt!=org.antlr.v4.runtime.atn.ATN.INVALID_ALT_NUMBER ) {
				if ( _alt==1 ) {
					{
					{
					setState(304);
					match(DOT);
					setState(305);
					match(IDENTIFIER);
					}
					} 
				}
				setState(310);
				_errHandler.sync(this);
				_alt = getInterpreter().adaptivePredict(_input,23,_ctx);
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
	public static class Flag_listContext extends ParserRuleContext {
		public List<TerminalNode> IDENTIFIER() { return getTokens(CSharpRoutineParser.IDENTIFIER); }
		public TerminalNode IDENTIFIER(int i) {
			return getToken(CSharpRoutineParser.IDENTIFIER, i);
		}
		public List<TerminalNode> COMMA() { return getTokens(CSharpRoutineParser.COMMA); }
		public TerminalNode COMMA(int i) {
			return getToken(CSharpRoutineParser.COMMA, i);
		}
		public Flag_listContext(ParserRuleContext parent, int invokingState) {
			super(parent, invokingState);
		}
		@Override public int getRuleIndex() { return RULE_flag_list; }
	}

	public final Flag_listContext flag_list() throws RecognitionException {
		Flag_listContext _localctx = new Flag_listContext(_ctx, getState());
		enterRule(_localctx, 46, RULE_flag_list);
		int _la;
		try {
			enterOuterAlt(_localctx, 1);
			{
			setState(311);
			match(IDENTIFIER);
			setState(316);
			_errHandler.sync(this);
			_la = _input.LA(1);
			while (_la==COMMA) {
				{
				{
				setState(312);
				match(COMMA);
				setState(313);
				match(IDENTIFIER);
				}
				}
				setState(318);
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
	public static class LiteralContext extends ParserRuleContext {
		public TerminalNode INTEGER_LITERAL() { return getToken(CSharpRoutineParser.INTEGER_LITERAL, 0); }
		public TerminalNode FLOATING_POINT_LITERAL() { return getToken(CSharpRoutineParser.FLOATING_POINT_LITERAL, 0); }
		public TerminalNode BOOLEAN_LITERAL() { return getToken(CSharpRoutineParser.BOOLEAN_LITERAL, 0); }
		public TerminalNode CHARACTER_LITERAL() { return getToken(CSharpRoutineParser.CHARACTER_LITERAL, 0); }
		public TerminalNode STRING_LITERAL() { return getToken(CSharpRoutineParser.STRING_LITERAL, 0); }
		public TerminalNode NULL_LITERAL() { return getToken(CSharpRoutineParser.NULL_LITERAL, 0); }
		public TerminalNode NODE() { return getToken(CSharpRoutineParser.NODE, 0); }
		public TerminalNode SIGNAL() { return getToken(CSharpRoutineParser.SIGNAL, 0); }
		public LiteralContext(ParserRuleContext parent, int invokingState) {
			super(parent, invokingState);
		}
		@Override public int getRuleIndex() { return RULE_literal; }
	}

	public final LiteralContext literal() throws RecognitionException {
		LiteralContext _localctx = new LiteralContext(_ctx, getState());
		enterRule(_localctx, 48, RULE_literal);
		int _la;
		try {
			enterOuterAlt(_localctx, 1);
			{
			setState(319);
			_la = _input.LA(1);
			if ( !((((_la) & ~0x3f) == 0 && ((1L << _la) & 2114322432L) != 0)) ) {
			_errHandler.recoverInline(this);
			}
			else {
				if ( _input.LA(1)==Token.EOF ) matchedEOF = true;
				_errHandler.reportMatch(this);
				consume();
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

	public boolean sempred(RuleContext _localctx, int ruleIndex, int predIndex) {
		switch (ruleIndex) {
		case 18:
			return expression_sempred((ExpressionContext)_localctx, predIndex);
		case 20:
			return type_sempred((TypeContext)_localctx, predIndex);
		}
		return true;
	}
	private boolean expression_sempred(ExpressionContext _localctx, int predIndex) {
		switch (predIndex) {
		case 0:
			return precpred(_ctx, 20);
		case 1:
			return precpred(_ctx, 19);
		case 2:
			return precpred(_ctx, 18);
		case 3:
			return precpred(_ctx, 17);
		case 4:
			return precpred(_ctx, 16);
		case 5:
			return precpred(_ctx, 15);
		case 6:
			return precpred(_ctx, 14);
		case 7:
			return precpred(_ctx, 13);
		case 8:
			return precpred(_ctx, 12);
		case 9:
			return precpred(_ctx, 11);
		case 10:
			return precpred(_ctx, 10);
		case 11:
			return precpred(_ctx, 9);
		case 12:
			return precpred(_ctx, 8);
		case 13:
			return precpred(_ctx, 7);
		case 14:
			return precpred(_ctx, 6);
		case 15:
			return precpred(_ctx, 5);
		case 16:
			return precpred(_ctx, 4);
		case 17:
			return precpred(_ctx, 3);
		case 18:
			return precpred(_ctx, 2);
		case 19:
			return precpred(_ctx, 1);
		case 20:
			return precpred(_ctx, 24);
		case 21:
			return precpred(_ctx, 23);
		case 22:
			return precpred(_ctx, 22);
		}
		return true;
	}
	private boolean type_sempred(TypeContext _localctx, int predIndex) {
		switch (predIndex) {
		case 23:
			return precpred(_ctx, 2);
		}
		return true;
	}

	public static final String _serializedATN =
		"\u0004\u0001M\u0142\u0002\u0000\u0007\u0000\u0002\u0001\u0007\u0001\u0002"+
		"\u0002\u0007\u0002\u0002\u0003\u0007\u0003\u0002\u0004\u0007\u0004\u0002"+
		"\u0005\u0007\u0005\u0002\u0006\u0007\u0006\u0002\u0007\u0007\u0007\u0002"+
		"\b\u0007\b\u0002\t\u0007\t\u0002\n\u0007\n\u0002\u000b\u0007\u000b\u0002"+
		"\f\u0007\f\u0002\r\u0007\r\u0002\u000e\u0007\u000e\u0002\u000f\u0007\u000f"+
		"\u0002\u0010\u0007\u0010\u0002\u0011\u0007\u0011\u0002\u0012\u0007\u0012"+
		"\u0002\u0013\u0007\u0013\u0002\u0014\u0007\u0014\u0002\u0015\u0007\u0015"+
		"\u0002\u0016\u0007\u0016\u0002\u0017\u0007\u0017\u0002\u0018\u0007\u0018"+
		"\u0001\u0000\u0005\u00004\b\u0000\n\u0000\f\u00007\t\u0000\u0001\u0000"+
		"\u0001\u0000\u0001\u0001\u0001\u0001\u0001\u0001\u0001\u0001\u0001\u0002"+
		"\u0001\u0002\u0003\u0002A\b\u0002\u0001\u0002\u0001\u0002\u0001\u0003"+
		"\u0001\u0003\u0003\u0003G\b\u0003\u0001\u0003\u0001\u0003\u0001\u0004"+
		"\u0005\u0004L\b\u0004\n\u0004\f\u0004O\t\u0004\u0001\u0005\u0001\u0005"+
		"\u0001\u0005\u0001\u0005\u0001\u0005\u0001\u0005\u0003\u0005W\b\u0005"+
		"\u0001\u0006\u0001\u0006\u0003\u0006[\b\u0006\u0001\u0006\u0001\u0006"+
		"\u0001\u0007\u0004\u0007`\b\u0007\u000b\u0007\f\u0007a\u0001\b\u0001\b"+
		"\u0001\b\u0001\t\u0001\t\u0001\t\u0001\t\u0001\t\u0001\t\u0001\t\u0003"+
		"\tn\b\t\u0001\n\u0001\n\u0001\n\u0001\n\u0001\n\u0001\n\u0001\u000b\u0001"+
		"\u000b\u0005\u000bx\b\u000b\n\u000b\f\u000b{\t\u000b\u0001\u000b\u0001"+
		"\u000b\u0001\f\u0001\f\u0001\f\u0001\f\u0005\f\u0083\b\f\n\f\f\f\u0086"+
		"\t\f\u0001\f\u0001\f\u0001\f\u0005\f\u008b\b\f\n\f\f\f\u008e\t\f\u0003"+
		"\f\u0090\b\f\u0001\r\u0001\r\u0001\r\u0001\r\u0001\u000e\u0001\u000e\u0001"+
		"\u000e\u0003\u000e\u0099\b\u000e\u0001\u000f\u0001\u000f\u0001\u0010\u0001"+
		"\u0010\u0001\u0010\u0001\u0011\u0001\u0011\u0001\u0011\u0005\u0011\u00a3"+
		"\b\u0011\n\u0011\f\u0011\u00a6\t\u0011\u0001\u0012\u0001\u0012\u0001\u0012"+
		"\u0001\u0012\u0001\u0012\u0001\u0012\u0001\u0012\u0001\u0012\u0001\u0012"+
		"\u0001\u0012\u0001\u0012\u0001\u0012\u0001\u0012\u0001\u0012\u0001\u0012"+
		"\u0001\u0012\u0001\u0012\u0003\u0012\u00b9\b\u0012\u0001\u0012\u0003\u0012"+
		"\u00bc\b\u0012\u0001\u0012\u0001\u0012\u0001\u0012\u0001\u0012\u0001\u0012"+
		"\u0001\u0012\u0001\u0012\u0001\u0012\u0001\u0012\u0001\u0012\u0001\u0012"+
		"\u0001\u0012\u0001\u0012\u0001\u0012\u0001\u0012\u0001\u0012\u0001\u0012"+
		"\u0001\u0012\u0001\u0012\u0001\u0012\u0001\u0012\u0001\u0012\u0001\u0012"+
		"\u0001\u0012\u0001\u0012\u0001\u0012\u0001\u0012\u0001\u0012\u0001\u0012"+
		"\u0001\u0012\u0001\u0012\u0001\u0012\u0001\u0012\u0001\u0012\u0001\u0012"+
		"\u0001\u0012\u0001\u0012\u0001\u0012\u0001\u0012\u0001\u0012\u0001\u0012"+
		"\u0001\u0012\u0001\u0012\u0001\u0012\u0001\u0012\u0001\u0012\u0001\u0012"+
		"\u0001\u0012\u0001\u0012\u0001\u0012\u0001\u0012\u0001\u0012\u0001\u0012"+
		"\u0001\u0012\u0001\u0012\u0001\u0012\u0001\u0012\u0001\u0012\u0001\u0012"+
		"\u0001\u0012\u0001\u0012\u0001\u0012\u0001\u0012\u0001\u0012\u0001\u0012"+
		"\u0001\u0012\u0001\u0012\u0001\u0012\u0001\u0012\u0001\u0012\u0001\u0012"+
		"\u0001\u0012\u0001\u0012\u0001\u0012\u0001\u0012\u0001\u0012\u0003\u0012"+
		"\u010a\b\u0012\u0001\u0012\u0005\u0012\u010d\b\u0012\n\u0012\f\u0012\u0110"+
		"\t\u0012\u0001\u0013\u0001\u0013\u0001\u0014\u0001\u0014\u0001\u0014\u0001"+
		"\u0014\u0001\u0014\u0001\u0014\u0001\u0014\u0005\u0014\u011b\b\u0014\n"+
		"\u0014\f\u0014\u011e\t\u0014\u0001\u0014\u0001\u0014\u0003\u0014\u0122"+
		"\b\u0014\u0003\u0014\u0124\b\u0014\u0001\u0014\u0001\u0014\u0001\u0014"+
		"\u0005\u0014\u0129\b\u0014\n\u0014\f\u0014\u012c\t\u0014\u0001\u0015\u0001"+
		"\u0015\u0001\u0016\u0001\u0016\u0001\u0016\u0005\u0016\u0133\b\u0016\n"+
		"\u0016\f\u0016\u0136\t\u0016\u0001\u0017\u0001\u0017\u0001\u0017\u0005"+
		"\u0017\u013b\b\u0017\n\u0017\f\u0017\u013e\t\u0017\u0001\u0018\u0001\u0018"+
		"\u0001\u0018\u0000\u0002$(\u0019\u0000\u0002\u0004\u0006\b\n\f\u000e\u0010"+
		"\u0012\u0014\u0016\u0018\u001a\u001c\u001e \"$&(*,.0\u0000\u0004\u0001"+
		"\u0000BC\u0001\u0000*4\u0001\u0000\u0001\u0010\u0002\u0000\u0011\u0012"+
		"\u0019\u001e\u0161\u00005\u0001\u0000\u0000\u0000\u0002:\u0001\u0000\u0000"+
		"\u0000\u0004>\u0001\u0000\u0000\u0000\u0006D\u0001\u0000\u0000\u0000\b"+
		"M\u0001\u0000\u0000\u0000\nV\u0001\u0000\u0000\u0000\fX\u0001\u0000\u0000"+
		"\u0000\u000e_\u0001\u0000\u0000\u0000\u0010c\u0001\u0000\u0000\u0000\u0012"+
		"f\u0001\u0000\u0000\u0000\u0014o\u0001\u0000\u0000\u0000\u0016u\u0001"+
		"\u0000\u0000\u0000\u0018\u008f\u0001\u0000\u0000\u0000\u001a\u0091\u0001"+
		"\u0000\u0000\u0000\u001c\u0095\u0001\u0000\u0000\u0000\u001e\u009a\u0001"+
		"\u0000\u0000\u0000 \u009c\u0001\u0000\u0000\u0000\"\u009f\u0001\u0000"+
		"\u0000\u0000$\u00bb\u0001\u0000\u0000\u0000&\u0111\u0001\u0000\u0000\u0000"+
		"(\u0123\u0001\u0000\u0000\u0000*\u012d\u0001\u0000\u0000\u0000,\u012f"+
		"\u0001\u0000\u0000\u0000.\u0137\u0001\u0000\u0000\u00000\u013f\u0001\u0000"+
		"\u0000\u000024\u0003\u0002\u0001\u000032\u0001\u0000\u0000\u000047\u0001"+
		"\u0000\u0000\u000053\u0001\u0000\u0000\u000056\u0001\u0000\u0000\u0000"+
		"68\u0001\u0000\u0000\u000075\u0001\u0000\u0000\u000089\u0005\u0000\u0000"+
		"\u00019\u0001\u0001\u0000\u0000\u0000:;\u0003\u0004\u0002\u0000;<\u0003"+
		"\b\u0004\u0000<=\u0003\u0006\u0003\u0000=\u0003\u0001\u0000\u0000\u0000"+
		">@\u00056\u0000\u0000?A\u0003.\u0017\u0000@?\u0001\u0000\u0000\u0000@"+
		"A\u0001\u0000\u0000\u0000AB\u0001\u0000\u0000\u0000BC\u0005E\u0000\u0000"+
		"C\u0005\u0001\u0000\u0000\u0000DF\u0005E\u0000\u0000EG\u0003.\u0017\u0000"+
		"FE\u0001\u0000\u0000\u0000FG\u0001\u0000\u0000\u0000GH\u0001\u0000\u0000"+
		"\u0000HI\u00055\u0000\u0000I\u0007\u0001\u0000\u0000\u0000JL\u0003\n\u0005"+
		"\u0000KJ\u0001\u0000\u0000\u0000LO\u0001\u0000\u0000\u0000MK\u0001\u0000"+
		"\u0000\u0000MN\u0001\u0000\u0000\u0000N\t\u0001\u0000\u0000\u0000OM\u0001"+
		"\u0000\u0000\u0000PW\u0003\u0012\t\u0000QW\u0003\u0014\n\u0000RW\u0003"+
		"\f\u0006\u0000SW\u0003\u0010\b\u0000TW\u0003\u001a\r\u0000UW\u0003 \u0010"+
		"\u0000VP\u0001\u0000\u0000\u0000VQ\u0001\u0000\u0000\u0000VR\u0001\u0000"+
		"\u0000\u0000VS\u0001\u0000\u0000\u0000VT\u0001\u0000\u0000\u0000VU\u0001"+
		"\u0000\u0000\u0000W\u000b\u0001\u0000\u0000\u0000XZ\u0005!\u0000\u0000"+
		"Y[\u0003\u000e\u0007\u0000ZY\u0001\u0000\u0000\u0000Z[\u0001\u0000\u0000"+
		"\u0000[\\\u0001\u0000\u0000\u0000\\]\u0005\"\u0000\u0000]\r\u0001\u0000"+
		"\u0000\u0000^`\u0003\n\u0005\u0000_^\u0001\u0000\u0000\u0000`a\u0001\u0000"+
		"\u0000\u0000a_\u0001\u0000\u0000\u0000ab\u0001\u0000\u0000\u0000b\u000f"+
		"\u0001\u0000\u0000\u0000cd\u0003$\u0012\u0000de\u0005%\u0000\u0000e\u0011"+
		"\u0001\u0000\u0000\u0000fg\u0005\u0016\u0000\u0000gh\u0005\u001f\u0000"+
		"\u0000hi\u0003$\u0012\u0000ij\u0005 \u0000\u0000jm\u0003\n\u0005\u0000"+
		"kl\u0005\u0017\u0000\u0000ln\u0003\n\u0005\u0000mk\u0001\u0000\u0000\u0000"+
		"mn\u0001\u0000\u0000\u0000n\u0013\u0001\u0000\u0000\u0000op\u0005\u0018"+
		"\u0000\u0000pq\u0005\u001f\u0000\u0000qr\u0003$\u0012\u0000rs\u0005 \u0000"+
		"\u0000st\u0003\u0016\u000b\u0000t\u0015\u0001\u0000\u0000\u0000uy\u0005"+
		"!\u0000\u0000vx\u0003\u0018\f\u0000wv\u0001\u0000\u0000\u0000x{\u0001"+
		"\u0000\u0000\u0000yw\u0001\u0000\u0000\u0000yz\u0001\u0000\u0000\u0000"+
		"z|\u0001\u0000\u0000\u0000{y\u0001\u0000\u0000\u0000|}\u0005\"\u0000\u0000"+
		"}\u0017\u0001\u0000\u0000\u0000~\u007f\u0005\u0014\u0000\u0000\u007f\u0080"+
		"\u0003$\u0012\u0000\u0080\u0084\u0005(\u0000\u0000\u0081\u0083\u0003\n"+
		"\u0005\u0000\u0082\u0081\u0001\u0000\u0000\u0000\u0083\u0086\u0001\u0000"+
		"\u0000\u0000\u0084\u0082\u0001\u0000\u0000\u0000\u0084\u0085\u0001\u0000"+
		"\u0000\u0000\u0085\u0090\u0001\u0000\u0000\u0000\u0086\u0084\u0001\u0000"+
		"\u0000\u0000\u0087\u0088\u0005\u0015\u0000\u0000\u0088\u008c\u0005(\u0000"+
		"\u0000\u0089\u008b\u0003\n\u0005\u0000\u008a\u0089\u0001\u0000\u0000\u0000"+
		"\u008b\u008e\u0001\u0000\u0000\u0000\u008c\u008a\u0001\u0000\u0000\u0000"+
		"\u008c\u008d\u0001\u0000\u0000\u0000\u008d\u0090\u0001\u0000\u0000\u0000"+
		"\u008e\u008c\u0001\u0000\u0000\u0000\u008f~\u0001\u0000\u0000\u0000\u008f"+
		"\u0087\u0001\u0000\u0000\u0000\u0090\u0019\u0001\u0000\u0000\u0000\u0091"+
		"\u0092\u0003(\u0014\u0000\u0092\u0093\u0003\u001c\u000e\u0000\u0093\u0094"+
		"\u0005%\u0000\u0000\u0094\u001b\u0001\u0000\u0000\u0000\u0095\u0098\u0003"+
		"\u001e\u000f\u0000\u0096\u0097\u0005*\u0000\u0000\u0097\u0099\u0003$\u0012"+
		"\u0000\u0098\u0096\u0001\u0000\u0000\u0000\u0098\u0099\u0001\u0000\u0000"+
		"\u0000\u0099\u001d\u0001\u0000\u0000\u0000\u009a\u009b\u0005J\u0000\u0000"+
		"\u009b\u001f\u0001\u0000\u0000\u0000\u009c\u009d\u0005\u0013\u0000\u0000"+
		"\u009d\u009e\u0005%\u0000\u0000\u009e!\u0001\u0000\u0000\u0000\u009f\u00a4"+
		"\u0003$\u0012\u0000\u00a0\u00a1\u0005&\u0000\u0000\u00a1\u00a3\u0003$"+
		"\u0012\u0000\u00a2\u00a0\u0001\u0000\u0000\u0000\u00a3\u00a6\u0001\u0000"+
		"\u0000\u0000\u00a4\u00a2\u0001\u0000\u0000\u0000\u00a4\u00a5\u0001\u0000"+
		"\u0000\u0000\u00a5#\u0001\u0000\u0000\u0000\u00a6\u00a4\u0001\u0000\u0000"+
		"\u0000\u00a7\u00a8\u0006\u0012\uffff\uffff\u0000\u00a8\u00bc\u0003,\u0016"+
		"\u0000\u00a9\u00bc\u00030\u0018\u0000\u00aa\u00ab\u0005\u001f\u0000\u0000"+
		"\u00ab\u00ac\u0003$\u0012\u0000\u00ac\u00ad\u0005 \u0000\u0000\u00ad\u00bc"+
		"\u0001\u0000\u0000\u0000\u00ae\u00b9\u0005E\u0000\u0000\u00af\u00b9\u0005"+
		"D\u0000\u0000\u00b0\u00b9\u0005;\u0000\u0000\u00b1\u00b9\u0005<\u0000"+
		"\u0000\u00b2\u00b9\u0005C\u0000\u0000\u00b3\u00b9\u0005B\u0000\u0000\u00b4"+
		"\u00b5\u0005\u001f\u0000\u0000\u00b5\u00b6\u0003(\u0014\u0000\u00b6\u00b7"+
		"\u0005 \u0000\u0000\u00b7\u00b9\u0001\u0000\u0000\u0000\u00b8\u00ae\u0001"+
		"\u0000\u0000\u0000\u00b8\u00af\u0001\u0000\u0000\u0000\u00b8\u00b0\u0001"+
		"\u0000\u0000\u0000\u00b8\u00b1\u0001\u0000\u0000\u0000\u00b8\u00b2\u0001"+
		"\u0000\u0000\u0000\u00b8\u00b3\u0001\u0000\u0000\u0000\u00b8\u00b4\u0001"+
		"\u0000\u0000\u0000\u00b9\u00ba\u0001\u0000\u0000\u0000\u00ba\u00bc\u0003"+
		"$\u0012\u0015\u00bb\u00a7\u0001\u0000\u0000\u0000\u00bb\u00a9\u0001\u0000"+
		"\u0000\u0000\u00bb\u00aa\u0001\u0000\u0000\u0000\u00bb\u00b8\u0001\u0000"+
		"\u0000\u0000\u00bc\u010e\u0001\u0000\u0000\u0000\u00bd\u00be\n\u0014\u0000"+
		"\u0000\u00be\u00bf\u0005F\u0000\u0000\u00bf\u010d\u0003$\u0012\u0015\u00c0"+
		"\u00c1\n\u0013\u0000\u0000\u00c1\u00c2\u0005G\u0000\u0000\u00c2\u010d"+
		"\u0003$\u0012\u0014\u00c3\u00c4\n\u0012\u0000\u0000\u00c4\u00c5\u0005"+
		"H\u0000\u0000\u00c5\u010d\u0003$\u0012\u0013\u00c6\u00c7\n\u0011\u0000"+
		"\u0000\u00c7\u00c8\u0005D\u0000\u0000\u00c8\u010d\u0003$\u0012\u0012\u00c9"+
		"\u00ca\n\u0010\u0000\u0000\u00ca\u00cb\u0005E\u0000\u0000\u00cb\u010d"+
		"\u0003$\u0012\u0011\u00cc\u00cd\n\u000f\u0000\u0000\u00cd\u00ce\u0005"+
		"6\u0000\u0000\u00ce\u00cf\u00056\u0000\u0000\u00cf\u010d\u0003$\u0012"+
		"\u0010\u00d0\u00d1\n\u000e\u0000\u0000\u00d1\u00d2\u00055\u0000\u0000"+
		"\u00d2\u00d3\u00055\u0000\u0000\u00d3\u010d\u0003$\u0012\u000f\u00d4\u00d5"+
		"\n\r\u0000\u0000\u00d5\u00d6\u00056\u0000\u0000\u00d6\u010d\u0003$\u0012"+
		"\u000e\u00d7\u00d8\n\f\u0000\u0000\u00d8\u00d9\u00055\u0000\u0000\u00d9"+
		"\u010d\u0003$\u0012\r\u00da\u00db\n\u000b\u0000\u0000\u00db\u00dc\u0005"+
		"8\u0000\u0000\u00dc\u010d\u0003$\u0012\f\u00dd\u00de\n\n\u0000\u0000\u00de"+
		"\u00df\u00059\u0000\u0000\u00df\u010d\u0003$\u0012\u000b\u00e0\u00e1\n"+
		"\t\u0000\u0000\u00e1\u00e2\u00057\u0000\u0000\u00e2\u010d\u0003$\u0012"+
		"\n\u00e3\u00e4\n\b\u0000\u0000\u00e4\u00e5\u0005:\u0000\u0000\u00e5\u010d"+
		"\u0003$\u0012\t\u00e6\u00e7\n\u0007\u0000\u0000\u00e7\u00e8\u0005=\u0000"+
		"\u0000\u00e8\u010d\u0003$\u0012\b\u00e9\u00ea\n\u0006\u0000\u0000\u00ea"+
		"\u00eb\u0005>\u0000\u0000\u00eb\u010d\u0003$\u0012\u0007\u00ec\u00ed\n"+
		"\u0005\u0000\u0000\u00ed\u00ee\u0005?\u0000\u0000\u00ee\u010d\u0003$\u0012"+
		"\u0006\u00ef\u00f0\n\u0004\u0000\u0000\u00f0\u00f1\u0005@\u0000\u0000"+
		"\u00f1\u010d\u0003$\u0012\u0005\u00f2\u00f3\n\u0003\u0000\u0000\u00f3"+
		"\u00f4\u0005A\u0000\u0000\u00f4\u010d\u0003$\u0012\u0004\u00f5\u00f6\n"+
		"\u0002\u0000\u0000\u00f6\u00f7\u0005I\u0000\u0000\u00f7\u00f8\u0003$\u0012"+
		"\u0000\u00f8\u00f9\u0005(\u0000\u0000\u00f9\u00fa\u0003$\u0012\u0002\u00fa"+
		"\u010d\u0001\u0000\u0000\u0000\u00fb\u00fc\n\u0001\u0000\u0000\u00fc\u00fd"+
		"\u0003&\u0013\u0000\u00fd\u00fe\u0003$\u0012\u0002\u00fe\u010d\u0001\u0000"+
		"\u0000\u0000\u00ff\u0100\n\u0018\u0000\u0000\u0100\u010d\u0007\u0000\u0000"+
		"\u0000\u0101\u0102\n\u0017\u0000\u0000\u0102\u0103\u0005#\u0000\u0000"+
		"\u0103\u0104\u0003$\u0012\u0000\u0104\u0105\u0005$\u0000\u0000\u0105\u010d"+
		"\u0001\u0000\u0000\u0000\u0106\u0107\n\u0016\u0000\u0000\u0107\u0109\u0005"+
		"\u001f\u0000\u0000\u0108\u010a\u0003\"\u0011\u0000\u0109\u0108\u0001\u0000"+
		"\u0000\u0000\u0109\u010a\u0001\u0000\u0000\u0000\u010a\u010b\u0001\u0000"+
		"\u0000\u0000\u010b\u010d\u0005 \u0000\u0000\u010c\u00bd\u0001\u0000\u0000"+
		"\u0000\u010c\u00c0\u0001\u0000\u0000\u0000\u010c\u00c3\u0001\u0000\u0000"+
		"\u0000\u010c\u00c6\u0001\u0000\u0000\u0000\u010c\u00c9\u0001\u0000\u0000"+
		"\u0000\u010c\u00cc\u0001\u0000\u0000\u0000\u010c\u00d0\u0001\u0000\u0000"+
		"\u0000\u010c\u00d4\u0001\u0000\u0000\u0000\u010c\u00d7\u0001\u0000\u0000"+
		"\u0000\u010c\u00da\u0001\u0000\u0000\u0000\u010c\u00dd\u0001\u0000\u0000"+
		"\u0000\u010c\u00e0\u0001\u0000\u0000\u0000\u010c\u00e3\u0001\u0000\u0000"+
		"\u0000\u010c\u00e6\u0001\u0000\u0000\u0000\u010c\u00e9\u0001\u0000\u0000"+
		"\u0000\u010c\u00ec\u0001\u0000\u0000\u0000\u010c\u00ef\u0001\u0000\u0000"+
		"\u0000\u010c\u00f2\u0001\u0000\u0000\u0000\u010c\u00f5\u0001\u0000\u0000"+
		"\u0000\u010c\u00fb\u0001\u0000\u0000\u0000\u010c\u00ff\u0001\u0000\u0000"+
		"\u0000\u010c\u0101\u0001\u0000\u0000\u0000\u010c\u0106\u0001\u0000\u0000"+
		"\u0000\u010d\u0110\u0001\u0000\u0000\u0000\u010e\u010c\u0001\u0000\u0000"+
		"\u0000\u010e\u010f\u0001\u0000\u0000\u0000\u010f%\u0001\u0000\u0000\u0000"+
		"\u0110\u010e\u0001\u0000\u0000\u0000\u0111\u0112\u0007\u0001\u0000\u0000"+
		"\u0112\'\u0001\u0000\u0000\u0000\u0113\u0114\u0006\u0014\uffff\uffff\u0000"+
		"\u0114\u0124\u0003*\u0015\u0000\u0115\u0121\u0003,\u0016\u0000\u0116\u0117"+
		"\u00056\u0000\u0000\u0117\u011c\u0003(\u0014\u0000\u0118\u0119\u0005&"+
		"\u0000\u0000\u0119\u011b\u0003(\u0014\u0000\u011a\u0118\u0001\u0000\u0000"+
		"\u0000\u011b\u011e\u0001\u0000\u0000\u0000\u011c\u011a\u0001\u0000\u0000"+
		"\u0000\u011c\u011d\u0001\u0000\u0000\u0000\u011d\u011f\u0001\u0000\u0000"+
		"\u0000\u011e\u011c\u0001\u0000\u0000\u0000\u011f\u0120\u00055\u0000\u0000"+
		"\u0120\u0122\u0001\u0000\u0000\u0000\u0121\u0116\u0001\u0000\u0000\u0000"+
		"\u0121\u0122\u0001\u0000\u0000\u0000\u0122\u0124\u0001\u0000\u0000\u0000"+
		"\u0123\u0113\u0001\u0000\u0000\u0000\u0123\u0115\u0001\u0000\u0000\u0000"+
		"\u0124\u012a\u0001\u0000\u0000\u0000\u0125\u0126\n\u0002\u0000\u0000\u0126"+
		"\u0127\u0005#\u0000\u0000\u0127\u0129\u0005$\u0000\u0000\u0128\u0125\u0001"+
		"\u0000\u0000\u0000\u0129\u012c\u0001\u0000\u0000\u0000\u012a\u0128\u0001"+
		"\u0000\u0000\u0000\u012a\u012b\u0001\u0000\u0000\u0000\u012b)\u0001\u0000"+
		"\u0000\u0000\u012c\u012a\u0001\u0000\u0000\u0000\u012d\u012e\u0007\u0002"+
		"\u0000\u0000\u012e+\u0001\u0000\u0000\u0000\u012f\u0134\u0005J\u0000\u0000"+
		"\u0130\u0131\u0005\'\u0000\u0000\u0131\u0133\u0005J\u0000\u0000\u0132"+
		"\u0130\u0001\u0000\u0000\u0000\u0133\u0136\u0001\u0000\u0000\u0000\u0134"+
		"\u0132\u0001\u0000\u0000\u0000\u0134\u0135\u0001\u0000\u0000\u0000\u0135"+
		"-\u0001\u0000\u0000\u0000\u0136\u0134\u0001\u0000\u0000\u0000\u0137\u013c"+
		"\u0005J\u0000\u0000\u0138\u0139\u0005&\u0000\u0000\u0139\u013b\u0005J"+
		"\u0000\u0000\u013a\u0138\u0001\u0000\u0000\u0000\u013b\u013e\u0001\u0000"+
		"\u0000\u0000\u013c\u013a\u0001\u0000\u0000\u0000\u013c\u013d\u0001\u0000"+
		"\u0000\u0000\u013d/\u0001\u0000\u0000\u0000\u013e\u013c\u0001\u0000\u0000"+
		"\u0000\u013f\u0140\u0007\u0003\u0000\u0000\u01401\u0001\u0000\u0000\u0000"+
		"\u00195@FMVZamy\u0084\u008c\u008f\u0098\u00a4\u00b8\u00bb\u0109\u010c"+
		"\u010e\u011c\u0121\u0123\u012a\u0134\u013c";
	public static final ATN _ATN =
		new ATNDeserializer().deserialize(_serializedATN.toCharArray());
	static {
		_decisionToDFA = new DFA[_ATN.getNumberOfDecisions()];
		for (int i = 0; i < _ATN.getNumberOfDecisions(); i++) {
			_decisionToDFA[i] = new DFA(_ATN.getDecisionState(i), i);
		}
	}
}