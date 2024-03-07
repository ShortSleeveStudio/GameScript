// Generated from ./CSharpRoutineParser.g4 by ANTLR 4.13.1
// noinspection ES6UnusedImports,JSUnusedGlobalSymbols,JSUnusedLocalSymbols

import {
	ATN,
	ATNDeserializer, DecisionState, DFA, FailedPredicateException,
	RecognitionException, NoViableAltException, BailErrorStrategy,
	Parser, ParserATNSimulator,
	RuleContext, ParserRuleContext, PredictionMode, PredictionContextCache,
	TerminalNode, RuleNode,
	Token, TokenStream,
	Interval, IntervalSet
} from 'antlr4';
import CSharpRoutineParserListener from "./CSharpRoutineParserListener.js";
// for running tests with parameters, TODO: discuss strategy for typed parameters in CI
// eslint-disable-next-line no-unused-vars
type int = number;

export default class CSharpRoutineParser extends Parser {
	public static readonly TYPE_BOOLEAN = 1;
	public static readonly TYPE_CHAR = 2;
	public static readonly TYPE_FLOAT_DEFAULT = 3;
	public static readonly TYPE_FLOAT32 = 4;
	public static readonly TYPE_FLOAT64 = 5;
	public static readonly TYPE_INT_DEFAULT = 6;
	public static readonly TYPE_INT8 = 7;
	public static readonly TYPE_INT16 = 8;
	public static readonly TYPE_INT32 = 9;
	public static readonly TYPE_INT64 = 10;
	public static readonly TYPE_UINT_DEFAULT = 11;
	public static readonly TYPE_UINT8 = 12;
	public static readonly TYPE_UINT16 = 13;
	public static readonly TYPE_UINT32 = 14;
	public static readonly TYPE_UINT64 = 15;
	public static readonly TYPE_STRING = 16;
	public static readonly NODE = 17;
	public static readonly SIGNAL = 18;
	public static readonly BREAK = 19;
	public static readonly CASE = 20;
	public static readonly DEFAULT = 21;
	public static readonly IF = 22;
	public static readonly ELSE = 23;
	public static readonly SWITCH = 24;
	public static readonly INTEGER_LITERAL = 25;
	public static readonly FLOATING_POINT_LITERAL = 26;
	public static readonly BOOLEAN_LITERAL = 27;
	public static readonly CHARACTER_LITERAL = 28;
	public static readonly STRING_LITERAL = 29;
	public static readonly NULL_LITERAL = 30;
	public static readonly LPAREN = 31;
	public static readonly RPAREN = 32;
	public static readonly LBRACE = 33;
	public static readonly RBRACE = 34;
	public static readonly LBRACK = 35;
	public static readonly RBRACK = 36;
	public static readonly SEMI = 37;
	public static readonly COMMA = 38;
	public static readonly DOT = 39;
	public static readonly COLON = 40;
	public static readonly COLONCOLON = 41;
	public static readonly ASSIGN = 42;
	public static readonly ADD_ASSIGN = 43;
	public static readonly SUB_ASSIGN = 44;
	public static readonly MUL_ASSIGN = 45;
	public static readonly DIV_ASSIGN = 46;
	public static readonly AND_ASSIGN = 47;
	public static readonly OR_ASSIGN = 48;
	public static readonly XOR_ASSIGN = 49;
	public static readonly MOD_ASSIGN = 50;
	public static readonly LSHIFT_ASSIGN = 51;
	public static readonly RSHIFT_ASSIGN = 52;
	public static readonly GT = 53;
	public static readonly LT = 54;
	public static readonly EQUAL = 55;
	public static readonly LE = 56;
	public static readonly GE = 57;
	public static readonly NOTEQUAL = 58;
	public static readonly NOT = 59;
	public static readonly BIT_NOT = 60;
	public static readonly BIT_AND = 61;
	public static readonly BIT_OR = 62;
	public static readonly BIT_XOR = 63;
	public static readonly AND = 64;
	public static readonly OR = 65;
	public static readonly INC = 66;
	public static readonly DEC = 67;
	public static readonly ADD = 68;
	public static readonly SUB = 69;
	public static readonly MUL = 70;
	public static readonly DIV = 71;
	public static readonly MOD = 72;
	public static readonly TERNARY = 73;
	public static readonly IDENTIFIER = 74;
	public static readonly WHITESPACE = 75;
	public static readonly COMMENT_BLOCK = 76;
	public static readonly COMMENT_LINE = 77;
	public static readonly EOF = Token.EOF;
	public static readonly RULE_routine = 0;
	public static readonly RULE_scheduled_block = 1;
	public static readonly RULE_scheduled_block_open = 2;
	public static readonly RULE_scheduled_block_close = 3;
	public static readonly RULE_block = 4;
	public static readonly RULE_statement = 5;
	public static readonly RULE_compound_statement = 6;
	public static readonly RULE_statement_list = 7;
	public static readonly RULE_expression_statement = 8;
	public static readonly RULE_if_statement = 9;
	public static readonly RULE_switch_statement = 10;
	public static readonly RULE_switch_block = 11;
	public static readonly RULE_switch_label = 12;
	public static readonly RULE_declaration_statement = 13;
	public static readonly RULE_declarator_init = 14;
	public static readonly RULE_declarator = 15;
	public static readonly RULE_break_statement = 16;
	public static readonly RULE_expression_list = 17;
	public static readonly RULE_expression = 18;
	public static readonly RULE_assignment_operator = 19;
	public static readonly RULE_type = 20;
	public static readonly RULE_primitive_type = 21;
	public static readonly RULE_name = 22;
	public static readonly RULE_flag_list = 23;
	public static readonly RULE_literal = 24;
	public static readonly literalNames: (string | null)[] = [ null, "'bool'", 
                                                            "'char'", "'float'", 
                                                            "'float32'", 
                                                            "'float64'", 
                                                            "'int'", "'int8'", 
                                                            "'int16'", "'int32'", 
                                                            "'int64'", "'uint'", 
                                                            "'uint8'", "'uint16'", 
                                                            "'uint32'", 
                                                            "'uint64'", 
                                                            "'string'", 
                                                            "'@node'", "'@sig'", 
                                                            "'break'", "'case'", 
                                                            "'default'", 
                                                            "'if'", "'else'", 
                                                            "'switch'", 
                                                            null, null, 
                                                            null, null, 
                                                            null, "'null'", 
                                                            "'('", "')'", 
                                                            "'{'", "'}'", 
                                                            "'['", "']'", 
                                                            "';'", "','", 
                                                            "'.'", "':'", 
                                                            "'::'", "'='", 
                                                            "'+='", "'-='", 
                                                            "'*='", "'/='", 
                                                            "'&='", "'|='", 
                                                            "'^='", "'%='", 
                                                            "'<<='", "'>>='", 
                                                            "'>'", "'<'", 
                                                            "'=='", "'<='", 
                                                            "'>='", "'!='", 
                                                            "'!'", "'~'", 
                                                            "'&'", "'|'", 
                                                            "'^'", "'&&'", 
                                                            "'||'", "'++'", 
                                                            "'--'", "'+'", 
                                                            "'-'", "'*'", 
                                                            "'/'", "'%'", 
                                                            "'?'" ];
	public static readonly symbolicNames: (string | null)[] = [ null, "TYPE_BOOLEAN", 
                                                             "TYPE_CHAR", 
                                                             "TYPE_FLOAT_DEFAULT", 
                                                             "TYPE_FLOAT32", 
                                                             "TYPE_FLOAT64", 
                                                             "TYPE_INT_DEFAULT", 
                                                             "TYPE_INT8", 
                                                             "TYPE_INT16", 
                                                             "TYPE_INT32", 
                                                             "TYPE_INT64", 
                                                             "TYPE_UINT_DEFAULT", 
                                                             "TYPE_UINT8", 
                                                             "TYPE_UINT16", 
                                                             "TYPE_UINT32", 
                                                             "TYPE_UINT64", 
                                                             "TYPE_STRING", 
                                                             "NODE", "SIGNAL", 
                                                             "BREAK", "CASE", 
                                                             "DEFAULT", 
                                                             "IF", "ELSE", 
                                                             "SWITCH", "INTEGER_LITERAL", 
                                                             "FLOATING_POINT_LITERAL", 
                                                             "BOOLEAN_LITERAL", 
                                                             "CHARACTER_LITERAL", 
                                                             "STRING_LITERAL", 
                                                             "NULL_LITERAL", 
                                                             "LPAREN", "RPAREN", 
                                                             "LBRACE", "RBRACE", 
                                                             "LBRACK", "RBRACK", 
                                                             "SEMI", "COMMA", 
                                                             "DOT", "COLON", 
                                                             "COLONCOLON", 
                                                             "ASSIGN", "ADD_ASSIGN", 
                                                             "SUB_ASSIGN", 
                                                             "MUL_ASSIGN", 
                                                             "DIV_ASSIGN", 
                                                             "AND_ASSIGN", 
                                                             "OR_ASSIGN", 
                                                             "XOR_ASSIGN", 
                                                             "MOD_ASSIGN", 
                                                             "LSHIFT_ASSIGN", 
                                                             "RSHIFT_ASSIGN", 
                                                             "GT", "LT", 
                                                             "EQUAL", "LE", 
                                                             "GE", "NOTEQUAL", 
                                                             "NOT", "BIT_NOT", 
                                                             "BIT_AND", 
                                                             "BIT_OR", "BIT_XOR", 
                                                             "AND", "OR", 
                                                             "INC", "DEC", 
                                                             "ADD", "SUB", 
                                                             "MUL", "DIV", 
                                                             "MOD", "TERNARY", 
                                                             "IDENTIFIER", 
                                                             "WHITESPACE", 
                                                             "COMMENT_BLOCK", 
                                                             "COMMENT_LINE" ];
	// tslint:disable:no-trailing-whitespace
	public static readonly ruleNames: string[] = [
		"routine", "scheduled_block", "scheduled_block_open", "scheduled_block_close", 
		"block", "statement", "compound_statement", "statement_list", "expression_statement", 
		"if_statement", "switch_statement", "switch_block", "switch_label", "declaration_statement", 
		"declarator_init", "declarator", "break_statement", "expression_list", 
		"expression", "assignment_operator", "type", "primitive_type", "name", 
		"flag_list", "literal",
	];
	public get grammarFileName(): string { return "CSharpRoutineParser.g4"; }
	public get literalNames(): (string | null)[] { return CSharpRoutineParser.literalNames; }
	public get symbolicNames(): (string | null)[] { return CSharpRoutineParser.symbolicNames; }
	public get ruleNames(): string[] { return CSharpRoutineParser.ruleNames; }
	public get serializedATN(): number[] { return CSharpRoutineParser._serializedATN; }

	protected createFailedPredicateException(predicate?: string, message?: string): FailedPredicateException {
		return new FailedPredicateException(this, predicate, message);
	}

	constructor(input: TokenStream) {
		super(input);
		this._interp = new ParserATNSimulator(this, CSharpRoutineParser._ATN, CSharpRoutineParser.DecisionsToDFA, new PredictionContextCache());
	}
	// @RuleVersion(0)
	public routine(): RoutineContext {
		let localctx: RoutineContext = new RoutineContext(this, this._ctx, this.state);
		this.enterRule(localctx, 0, CSharpRoutineParser.RULE_routine);
		let _la: number;
		try {
			this.enterOuterAlt(localctx, 1);
			{
			this.state = 53;
			this._errHandler.sync(this);
			_la = this._input.LA(1);
			while (_la===54) {
				{
				{
				this.state = 50;
				this.scheduled_block();
				}
				}
				this.state = 55;
				this._errHandler.sync(this);
				_la = this._input.LA(1);
			}
			this.state = 56;
			this.match(CSharpRoutineParser.EOF);
			}
		}
		catch (re) {
			if (re instanceof RecognitionException) {
				localctx.exception = re;
				this._errHandler.reportError(this, re);
				this._errHandler.recover(this, re);
			} else {
				throw re;
			}
		}
		finally {
			this.exitRule();
		}
		return localctx;
	}
	// @RuleVersion(0)
	public scheduled_block(): Scheduled_blockContext {
		let localctx: Scheduled_blockContext = new Scheduled_blockContext(this, this._ctx, this.state);
		this.enterRule(localctx, 2, CSharpRoutineParser.RULE_scheduled_block);
		try {
			this.enterOuterAlt(localctx, 1);
			{
			this.state = 58;
			this.scheduled_block_open();
			this.state = 59;
			this.block();
			this.state = 60;
			this.scheduled_block_close();
			}
		}
		catch (re) {
			if (re instanceof RecognitionException) {
				localctx.exception = re;
				this._errHandler.reportError(this, re);
				this._errHandler.recover(this, re);
			} else {
				throw re;
			}
		}
		finally {
			this.exitRule();
		}
		return localctx;
	}
	// @RuleVersion(0)
	public scheduled_block_open(): Scheduled_block_openContext {
		let localctx: Scheduled_block_openContext = new Scheduled_block_openContext(this, this._ctx, this.state);
		this.enterRule(localctx, 4, CSharpRoutineParser.RULE_scheduled_block_open);
		let _la: number;
		try {
			this.enterOuterAlt(localctx, 1);
			{
			this.state = 62;
			this.match(CSharpRoutineParser.LT);
			this.state = 64;
			this._errHandler.sync(this);
			_la = this._input.LA(1);
			if (_la===74) {
				{
				this.state = 63;
				this.flag_list();
				}
			}

			this.state = 66;
			this.match(CSharpRoutineParser.SUB);
			}
		}
		catch (re) {
			if (re instanceof RecognitionException) {
				localctx.exception = re;
				this._errHandler.reportError(this, re);
				this._errHandler.recover(this, re);
			} else {
				throw re;
			}
		}
		finally {
			this.exitRule();
		}
		return localctx;
	}
	// @RuleVersion(0)
	public scheduled_block_close(): Scheduled_block_closeContext {
		let localctx: Scheduled_block_closeContext = new Scheduled_block_closeContext(this, this._ctx, this.state);
		this.enterRule(localctx, 6, CSharpRoutineParser.RULE_scheduled_block_close);
		let _la: number;
		try {
			this.enterOuterAlt(localctx, 1);
			{
			this.state = 68;
			this.match(CSharpRoutineParser.SUB);
			this.state = 70;
			this._errHandler.sync(this);
			_la = this._input.LA(1);
			if (_la===74) {
				{
				this.state = 69;
				this.flag_list();
				}
			}

			this.state = 72;
			this.match(CSharpRoutineParser.GT);
			}
		}
		catch (re) {
			if (re instanceof RecognitionException) {
				localctx.exception = re;
				this._errHandler.reportError(this, re);
				this._errHandler.recover(this, re);
			} else {
				throw re;
			}
		}
		finally {
			this.exitRule();
		}
		return localctx;
	}
	// @RuleVersion(0)
	public block(): BlockContext {
		let localctx: BlockContext = new BlockContext(this, this._ctx, this.state);
		this.enterRule(localctx, 8, CSharpRoutineParser.RULE_block);
		try {
			let _alt: number;
			this.enterOuterAlt(localctx, 1);
			{
			this.state = 77;
			this._errHandler.sync(this);
			_alt = this._interp.adaptivePredict(this._input, 3, this._ctx);
			while (_alt !== 2 && _alt !== ATN.INVALID_ALT_NUMBER) {
				if (_alt === 1) {
					{
					{
					this.state = 74;
					this.statement();
					}
					}
				}
				this.state = 79;
				this._errHandler.sync(this);
				_alt = this._interp.adaptivePredict(this._input, 3, this._ctx);
			}
			}
		}
		catch (re) {
			if (re instanceof RecognitionException) {
				localctx.exception = re;
				this._errHandler.reportError(this, re);
				this._errHandler.recover(this, re);
			} else {
				throw re;
			}
		}
		finally {
			this.exitRule();
		}
		return localctx;
	}
	// @RuleVersion(0)
	public statement(): StatementContext {
		let localctx: StatementContext = new StatementContext(this, this._ctx, this.state);
		this.enterRule(localctx, 10, CSharpRoutineParser.RULE_statement);
		try {
			this.state = 86;
			this._errHandler.sync(this);
			switch ( this._interp.adaptivePredict(this._input, 4, this._ctx) ) {
			case 1:
				this.enterOuterAlt(localctx, 1);
				{
				this.state = 80;
				this.if_statement();
				}
				break;
			case 2:
				this.enterOuterAlt(localctx, 2);
				{
				this.state = 81;
				this.switch_statement();
				}
				break;
			case 3:
				this.enterOuterAlt(localctx, 3);
				{
				this.state = 82;
				this.compound_statement();
				}
				break;
			case 4:
				this.enterOuterAlt(localctx, 4);
				{
				this.state = 83;
				this.expression_statement();
				}
				break;
			case 5:
				this.enterOuterAlt(localctx, 5);
				{
				this.state = 84;
				this.declaration_statement();
				}
				break;
			case 6:
				this.enterOuterAlt(localctx, 6);
				{
				this.state = 85;
				this.break_statement();
				}
				break;
			}
		}
		catch (re) {
			if (re instanceof RecognitionException) {
				localctx.exception = re;
				this._errHandler.reportError(this, re);
				this._errHandler.recover(this, re);
			} else {
				throw re;
			}
		}
		finally {
			this.exitRule();
		}
		return localctx;
	}
	// @RuleVersion(0)
	public compound_statement(): Compound_statementContext {
		let localctx: Compound_statementContext = new Compound_statementContext(this, this._ctx, this.state);
		this.enterRule(localctx, 12, CSharpRoutineParser.RULE_compound_statement);
		let _la: number;
		try {
			this.enterOuterAlt(localctx, 1);
			{
			this.state = 88;
			this.match(CSharpRoutineParser.LBRACE);
			this.state = 90;
			this._errHandler.sync(this);
			_la = this._input.LA(1);
			if ((((_la) & ~0x1F) === 0 && ((1 << _la) & 4283432958) !== 0) || ((((_la - 33)) & ~0x1F) === 0 && ((1 << (_la - 33)) & 201326593) !== 0) || ((((_la - 66)) & ~0x1F) === 0 && ((1 << (_la - 66)) & 271) !== 0)) {
				{
				this.state = 89;
				this.statement_list();
				}
			}

			this.state = 92;
			this.match(CSharpRoutineParser.RBRACE);
			}
		}
		catch (re) {
			if (re instanceof RecognitionException) {
				localctx.exception = re;
				this._errHandler.reportError(this, re);
				this._errHandler.recover(this, re);
			} else {
				throw re;
			}
		}
		finally {
			this.exitRule();
		}
		return localctx;
	}
	// @RuleVersion(0)
	public statement_list(): Statement_listContext {
		let localctx: Statement_listContext = new Statement_listContext(this, this._ctx, this.state);
		this.enterRule(localctx, 14, CSharpRoutineParser.RULE_statement_list);
		let _la: number;
		try {
			this.enterOuterAlt(localctx, 1);
			{
			this.state = 95;
			this._errHandler.sync(this);
			_la = this._input.LA(1);
			do {
				{
				{
				this.state = 94;
				this.statement();
				}
				}
				this.state = 97;
				this._errHandler.sync(this);
				_la = this._input.LA(1);
			} while ((((_la) & ~0x1F) === 0 && ((1 << _la) & 4283432958) !== 0) || ((((_la - 33)) & ~0x1F) === 0 && ((1 << (_la - 33)) & 201326593) !== 0) || ((((_la - 66)) & ~0x1F) === 0 && ((1 << (_la - 66)) & 271) !== 0));
			}
		}
		catch (re) {
			if (re instanceof RecognitionException) {
				localctx.exception = re;
				this._errHandler.reportError(this, re);
				this._errHandler.recover(this, re);
			} else {
				throw re;
			}
		}
		finally {
			this.exitRule();
		}
		return localctx;
	}
	// @RuleVersion(0)
	public expression_statement(): Expression_statementContext {
		let localctx: Expression_statementContext = new Expression_statementContext(this, this._ctx, this.state);
		this.enterRule(localctx, 16, CSharpRoutineParser.RULE_expression_statement);
		try {
			this.enterOuterAlt(localctx, 1);
			{
			this.state = 99;
			this.expression(0);
			this.state = 100;
			this.match(CSharpRoutineParser.SEMI);
			}
		}
		catch (re) {
			if (re instanceof RecognitionException) {
				localctx.exception = re;
				this._errHandler.reportError(this, re);
				this._errHandler.recover(this, re);
			} else {
				throw re;
			}
		}
		finally {
			this.exitRule();
		}
		return localctx;
	}
	// @RuleVersion(0)
	public if_statement(): If_statementContext {
		let localctx: If_statementContext = new If_statementContext(this, this._ctx, this.state);
		this.enterRule(localctx, 18, CSharpRoutineParser.RULE_if_statement);
		try {
			this.enterOuterAlt(localctx, 1);
			{
			this.state = 102;
			this.match(CSharpRoutineParser.IF);
			this.state = 103;
			this.match(CSharpRoutineParser.LPAREN);
			this.state = 104;
			this.expression(0);
			this.state = 105;
			this.match(CSharpRoutineParser.RPAREN);
			this.state = 106;
			this.statement();
			this.state = 109;
			this._errHandler.sync(this);
			switch ( this._interp.adaptivePredict(this._input, 7, this._ctx) ) {
			case 1:
				{
				this.state = 107;
				this.match(CSharpRoutineParser.ELSE);
				this.state = 108;
				this.statement();
				}
				break;
			}
			}
		}
		catch (re) {
			if (re instanceof RecognitionException) {
				localctx.exception = re;
				this._errHandler.reportError(this, re);
				this._errHandler.recover(this, re);
			} else {
				throw re;
			}
		}
		finally {
			this.exitRule();
		}
		return localctx;
	}
	// @RuleVersion(0)
	public switch_statement(): Switch_statementContext {
		let localctx: Switch_statementContext = new Switch_statementContext(this, this._ctx, this.state);
		this.enterRule(localctx, 20, CSharpRoutineParser.RULE_switch_statement);
		try {
			this.enterOuterAlt(localctx, 1);
			{
			this.state = 111;
			this.match(CSharpRoutineParser.SWITCH);
			this.state = 112;
			this.match(CSharpRoutineParser.LPAREN);
			this.state = 113;
			this.expression(0);
			this.state = 114;
			this.match(CSharpRoutineParser.RPAREN);
			this.state = 115;
			this.switch_block();
			}
		}
		catch (re) {
			if (re instanceof RecognitionException) {
				localctx.exception = re;
				this._errHandler.reportError(this, re);
				this._errHandler.recover(this, re);
			} else {
				throw re;
			}
		}
		finally {
			this.exitRule();
		}
		return localctx;
	}
	// @RuleVersion(0)
	public switch_block(): Switch_blockContext {
		let localctx: Switch_blockContext = new Switch_blockContext(this, this._ctx, this.state);
		this.enterRule(localctx, 22, CSharpRoutineParser.RULE_switch_block);
		let _la: number;
		try {
			this.enterOuterAlt(localctx, 1);
			{
			this.state = 117;
			this.match(CSharpRoutineParser.LBRACE);
			this.state = 121;
			this._errHandler.sync(this);
			_la = this._input.LA(1);
			while (_la===20 || _la===21) {
				{
				{
				this.state = 118;
				this.switch_label();
				}
				}
				this.state = 123;
				this._errHandler.sync(this);
				_la = this._input.LA(1);
			}
			this.state = 124;
			this.match(CSharpRoutineParser.RBRACE);
			}
		}
		catch (re) {
			if (re instanceof RecognitionException) {
				localctx.exception = re;
				this._errHandler.reportError(this, re);
				this._errHandler.recover(this, re);
			} else {
				throw re;
			}
		}
		finally {
			this.exitRule();
		}
		return localctx;
	}
	// @RuleVersion(0)
	public switch_label(): Switch_labelContext {
		let localctx: Switch_labelContext = new Switch_labelContext(this, this._ctx, this.state);
		this.enterRule(localctx, 24, CSharpRoutineParser.RULE_switch_label);
		let _la: number;
		try {
			this.state = 143;
			this._errHandler.sync(this);
			switch (this._input.LA(1)) {
			case 20:
				this.enterOuterAlt(localctx, 1);
				{
				this.state = 126;
				this.match(CSharpRoutineParser.CASE);
				this.state = 127;
				this.expression(0);
				this.state = 128;
				this.match(CSharpRoutineParser.COLON);
				this.state = 132;
				this._errHandler.sync(this);
				_la = this._input.LA(1);
				while ((((_la) & ~0x1F) === 0 && ((1 << _la) & 4283432958) !== 0) || ((((_la - 33)) & ~0x1F) === 0 && ((1 << (_la - 33)) & 201326593) !== 0) || ((((_la - 66)) & ~0x1F) === 0 && ((1 << (_la - 66)) & 271) !== 0)) {
					{
					{
					this.state = 129;
					this.statement();
					}
					}
					this.state = 134;
					this._errHandler.sync(this);
					_la = this._input.LA(1);
				}
				}
				break;
			case 21:
				this.enterOuterAlt(localctx, 2);
				{
				this.state = 135;
				this.match(CSharpRoutineParser.DEFAULT);
				this.state = 136;
				this.match(CSharpRoutineParser.COLON);
				this.state = 140;
				this._errHandler.sync(this);
				_la = this._input.LA(1);
				while ((((_la) & ~0x1F) === 0 && ((1 << _la) & 4283432958) !== 0) || ((((_la - 33)) & ~0x1F) === 0 && ((1 << (_la - 33)) & 201326593) !== 0) || ((((_la - 66)) & ~0x1F) === 0 && ((1 << (_la - 66)) & 271) !== 0)) {
					{
					{
					this.state = 137;
					this.statement();
					}
					}
					this.state = 142;
					this._errHandler.sync(this);
					_la = this._input.LA(1);
				}
				}
				break;
			default:
				throw new NoViableAltException(this);
			}
		}
		catch (re) {
			if (re instanceof RecognitionException) {
				localctx.exception = re;
				this._errHandler.reportError(this, re);
				this._errHandler.recover(this, re);
			} else {
				throw re;
			}
		}
		finally {
			this.exitRule();
		}
		return localctx;
	}
	// @RuleVersion(0)
	public declaration_statement(): Declaration_statementContext {
		let localctx: Declaration_statementContext = new Declaration_statementContext(this, this._ctx, this.state);
		this.enterRule(localctx, 26, CSharpRoutineParser.RULE_declaration_statement);
		try {
			this.enterOuterAlt(localctx, 1);
			{
			this.state = 145;
			this.type_(0);
			this.state = 146;
			this.declarator_init();
			this.state = 147;
			this.match(CSharpRoutineParser.SEMI);
			}
		}
		catch (re) {
			if (re instanceof RecognitionException) {
				localctx.exception = re;
				this._errHandler.reportError(this, re);
				this._errHandler.recover(this, re);
			} else {
				throw re;
			}
		}
		finally {
			this.exitRule();
		}
		return localctx;
	}
	// @RuleVersion(0)
	public declarator_init(): Declarator_initContext {
		let localctx: Declarator_initContext = new Declarator_initContext(this, this._ctx, this.state);
		this.enterRule(localctx, 28, CSharpRoutineParser.RULE_declarator_init);
		let _la: number;
		try {
			this.enterOuterAlt(localctx, 1);
			{
			this.state = 149;
			this.declarator();
			this.state = 152;
			this._errHandler.sync(this);
			_la = this._input.LA(1);
			if (_la===42) {
				{
				this.state = 150;
				this.match(CSharpRoutineParser.ASSIGN);
				this.state = 151;
				this.expression(0);
				}
			}

			}
		}
		catch (re) {
			if (re instanceof RecognitionException) {
				localctx.exception = re;
				this._errHandler.reportError(this, re);
				this._errHandler.recover(this, re);
			} else {
				throw re;
			}
		}
		finally {
			this.exitRule();
		}
		return localctx;
	}
	// @RuleVersion(0)
	public declarator(): DeclaratorContext {
		let localctx: DeclaratorContext = new DeclaratorContext(this, this._ctx, this.state);
		this.enterRule(localctx, 30, CSharpRoutineParser.RULE_declarator);
		try {
			this.enterOuterAlt(localctx, 1);
			{
			this.state = 154;
			this.match(CSharpRoutineParser.IDENTIFIER);
			}
		}
		catch (re) {
			if (re instanceof RecognitionException) {
				localctx.exception = re;
				this._errHandler.reportError(this, re);
				this._errHandler.recover(this, re);
			} else {
				throw re;
			}
		}
		finally {
			this.exitRule();
		}
		return localctx;
	}
	// @RuleVersion(0)
	public break_statement(): Break_statementContext {
		let localctx: Break_statementContext = new Break_statementContext(this, this._ctx, this.state);
		this.enterRule(localctx, 32, CSharpRoutineParser.RULE_break_statement);
		try {
			this.enterOuterAlt(localctx, 1);
			{
			this.state = 156;
			this.match(CSharpRoutineParser.BREAK);
			this.state = 157;
			this.match(CSharpRoutineParser.SEMI);
			}
		}
		catch (re) {
			if (re instanceof RecognitionException) {
				localctx.exception = re;
				this._errHandler.reportError(this, re);
				this._errHandler.recover(this, re);
			} else {
				throw re;
			}
		}
		finally {
			this.exitRule();
		}
		return localctx;
	}
	// @RuleVersion(0)
	public expression_list(): Expression_listContext {
		let localctx: Expression_listContext = new Expression_listContext(this, this._ctx, this.state);
		this.enterRule(localctx, 34, CSharpRoutineParser.RULE_expression_list);
		let _la: number;
		try {
			this.enterOuterAlt(localctx, 1);
			{
			this.state = 159;
			this.expression(0);
			this.state = 164;
			this._errHandler.sync(this);
			_la = this._input.LA(1);
			while (_la===38) {
				{
				{
				this.state = 160;
				this.match(CSharpRoutineParser.COMMA);
				this.state = 161;
				this.expression(0);
				}
				}
				this.state = 166;
				this._errHandler.sync(this);
				_la = this._input.LA(1);
			}
			}
		}
		catch (re) {
			if (re instanceof RecognitionException) {
				localctx.exception = re;
				this._errHandler.reportError(this, re);
				this._errHandler.recover(this, re);
			} else {
				throw re;
			}
		}
		finally {
			this.exitRule();
		}
		return localctx;
	}

	public expression(): ExpressionContext;
	public expression(_p: number): ExpressionContext;
	// @RuleVersion(0)
	public expression(_p?: number): ExpressionContext {
		if (_p === undefined) {
			_p = 0;
		}

		let _parentctx: ParserRuleContext = this._ctx;
		let _parentState: number = this.state;
		let localctx: ExpressionContext = new ExpressionContext(this, this._ctx, _parentState);
		let _prevctx: ExpressionContext = localctx;
		let _startState: number = 36;
		this.enterRecursionRule(localctx, 36, CSharpRoutineParser.RULE_expression, _p);
		let _la: number;
		try {
			let _alt: number;
			this.enterOuterAlt(localctx, 1);
			{
			this.state = 187;
			this._errHandler.sync(this);
			switch ( this._interp.adaptivePredict(this._input, 15, this._ctx) ) {
			case 1:
				{
				localctx = new Expression_primary_nameContext(this, localctx);
				this._ctx = localctx;
				_prevctx = localctx;

				this.state = 168;
				this.name();
				}
				break;
			case 2:
				{
				localctx = new Expression_primary_literalContext(this, localctx);
				this._ctx = localctx;
				_prevctx = localctx;
				this.state = 169;
				this.literal();
				}
				break;
			case 3:
				{
				localctx = new Expression_primary_parentheticalContext(this, localctx);
				this._ctx = localctx;
				_prevctx = localctx;
				this.state = 170;
				this.match(CSharpRoutineParser.LPAREN);
				this.state = 171;
				this.expression(0);
				this.state = 172;
				this.match(CSharpRoutineParser.RPAREN);
				}
				break;
			case 4:
				{
				localctx = new Expression_unaryContext(this, localctx);
				this._ctx = localctx;
				_prevctx = localctx;
				this.state = 184;
				this._errHandler.sync(this);
				switch (this._input.LA(1)) {
				case 69:
					{
					this.state = 174;
					this.match(CSharpRoutineParser.SUB);
					}
					break;
				case 68:
					{
					this.state = 175;
					this.match(CSharpRoutineParser.ADD);
					}
					break;
				case 59:
					{
					this.state = 176;
					this.match(CSharpRoutineParser.NOT);
					}
					break;
				case 60:
					{
					this.state = 177;
					this.match(CSharpRoutineParser.BIT_NOT);
					}
					break;
				case 67:
					{
					this.state = 178;
					this.match(CSharpRoutineParser.DEC);
					}
					break;
				case 66:
					{
					this.state = 179;
					this.match(CSharpRoutineParser.INC);
					}
					break;
				case 31:
					{
					this.state = 180;
					this.match(CSharpRoutineParser.LPAREN);
					this.state = 181;
					this.type_(0);
					this.state = 182;
					this.match(CSharpRoutineParser.RPAREN);
					}
					break;
				default:
					throw new NoViableAltException(this);
				}
				this.state = 186;
				this.expression(21);
				}
				break;
			}
			this._ctx.stop = this._input.LT(-1);
			this.state = 270;
			this._errHandler.sync(this);
			_alt = this._interp.adaptivePredict(this._input, 18, this._ctx);
			while (_alt !== 2 && _alt !== ATN.INVALID_ALT_NUMBER) {
				if (_alt === 1) {
					if (this._parseListeners != null) {
						this.triggerExitRuleEvent();
					}
					_prevctx = localctx;
					{
					this.state = 268;
					this._errHandler.sync(this);
					switch ( this._interp.adaptivePredict(this._input, 17, this._ctx) ) {
					case 1:
						{
						localctx = new Expression_multiplicative_mulContext(this, new ExpressionContext(this, _parentctx, _parentState));
						this.pushNewRecursionContext(localctx, _startState, CSharpRoutineParser.RULE_expression);
						this.state = 189;
						if (!(this.precpred(this._ctx, 20))) {
							throw this.createFailedPredicateException("this.precpred(this._ctx, 20)");
						}
						this.state = 190;
						this.match(CSharpRoutineParser.MUL);
						this.state = 191;
						this.expression(21);
						}
						break;
					case 2:
						{
						localctx = new Expression_multiplicative_divContext(this, new ExpressionContext(this, _parentctx, _parentState));
						this.pushNewRecursionContext(localctx, _startState, CSharpRoutineParser.RULE_expression);
						this.state = 192;
						if (!(this.precpred(this._ctx, 19))) {
							throw this.createFailedPredicateException("this.precpred(this._ctx, 19)");
						}
						this.state = 193;
						this.match(CSharpRoutineParser.DIV);
						this.state = 194;
						this.expression(20);
						}
						break;
					case 3:
						{
						localctx = new Expression_multiplicative_modContext(this, new ExpressionContext(this, _parentctx, _parentState));
						this.pushNewRecursionContext(localctx, _startState, CSharpRoutineParser.RULE_expression);
						this.state = 195;
						if (!(this.precpred(this._ctx, 18))) {
							throw this.createFailedPredicateException("this.precpred(this._ctx, 18)");
						}
						this.state = 196;
						this.match(CSharpRoutineParser.MOD);
						this.state = 197;
						this.expression(19);
						}
						break;
					case 4:
						{
						localctx = new Expression_additive_addContext(this, new ExpressionContext(this, _parentctx, _parentState));
						this.pushNewRecursionContext(localctx, _startState, CSharpRoutineParser.RULE_expression);
						this.state = 198;
						if (!(this.precpred(this._ctx, 17))) {
							throw this.createFailedPredicateException("this.precpred(this._ctx, 17)");
						}
						this.state = 199;
						this.match(CSharpRoutineParser.ADD);
						this.state = 200;
						this.expression(18);
						}
						break;
					case 5:
						{
						localctx = new Expression_additive_subContext(this, new ExpressionContext(this, _parentctx, _parentState));
						this.pushNewRecursionContext(localctx, _startState, CSharpRoutineParser.RULE_expression);
						this.state = 201;
						if (!(this.precpred(this._ctx, 16))) {
							throw this.createFailedPredicateException("this.precpred(this._ctx, 16)");
						}
						this.state = 202;
						this.match(CSharpRoutineParser.SUB);
						this.state = 203;
						this.expression(17);
						}
						break;
					case 6:
						{
						localctx = new Expression_shift_leftContext(this, new ExpressionContext(this, _parentctx, _parentState));
						this.pushNewRecursionContext(localctx, _startState, CSharpRoutineParser.RULE_expression);
						this.state = 204;
						if (!(this.precpred(this._ctx, 15))) {
							throw this.createFailedPredicateException("this.precpred(this._ctx, 15)");
						}
						this.state = 205;
						this.match(CSharpRoutineParser.LT);
						this.state = 206;
						this.match(CSharpRoutineParser.LT);
						this.state = 207;
						this.expression(16);
						}
						break;
					case 7:
						{
						localctx = new Expression_shift_rightContext(this, new ExpressionContext(this, _parentctx, _parentState));
						this.pushNewRecursionContext(localctx, _startState, CSharpRoutineParser.RULE_expression);
						this.state = 208;
						if (!(this.precpred(this._ctx, 14))) {
							throw this.createFailedPredicateException("this.precpred(this._ctx, 14)");
						}
						this.state = 209;
						this.match(CSharpRoutineParser.GT);
						this.state = 210;
						this.match(CSharpRoutineParser.GT);
						this.state = 211;
						this.expression(15);
						}
						break;
					case 8:
						{
						localctx = new Expression_relational_ltContext(this, new ExpressionContext(this, _parentctx, _parentState));
						this.pushNewRecursionContext(localctx, _startState, CSharpRoutineParser.RULE_expression);
						this.state = 212;
						if (!(this.precpred(this._ctx, 13))) {
							throw this.createFailedPredicateException("this.precpred(this._ctx, 13)");
						}
						this.state = 213;
						this.match(CSharpRoutineParser.LT);
						this.state = 214;
						this.expression(14);
						}
						break;
					case 9:
						{
						localctx = new Expression_relational_gtContext(this, new ExpressionContext(this, _parentctx, _parentState));
						this.pushNewRecursionContext(localctx, _startState, CSharpRoutineParser.RULE_expression);
						this.state = 215;
						if (!(this.precpred(this._ctx, 12))) {
							throw this.createFailedPredicateException("this.precpred(this._ctx, 12)");
						}
						this.state = 216;
						this.match(CSharpRoutineParser.GT);
						this.state = 217;
						this.expression(13);
						}
						break;
					case 10:
						{
						localctx = new Expression_relational_leContext(this, new ExpressionContext(this, _parentctx, _parentState));
						this.pushNewRecursionContext(localctx, _startState, CSharpRoutineParser.RULE_expression);
						this.state = 218;
						if (!(this.precpred(this._ctx, 11))) {
							throw this.createFailedPredicateException("this.precpred(this._ctx, 11)");
						}
						this.state = 219;
						this.match(CSharpRoutineParser.LE);
						this.state = 220;
						this.expression(12);
						}
						break;
					case 11:
						{
						localctx = new Expression_relational_geContext(this, new ExpressionContext(this, _parentctx, _parentState));
						this.pushNewRecursionContext(localctx, _startState, CSharpRoutineParser.RULE_expression);
						this.state = 221;
						if (!(this.precpred(this._ctx, 10))) {
							throw this.createFailedPredicateException("this.precpred(this._ctx, 10)");
						}
						this.state = 222;
						this.match(CSharpRoutineParser.GE);
						this.state = 223;
						this.expression(11);
						}
						break;
					case 12:
						{
						localctx = new Expression_equality_eqContext(this, new ExpressionContext(this, _parentctx, _parentState));
						this.pushNewRecursionContext(localctx, _startState, CSharpRoutineParser.RULE_expression);
						this.state = 224;
						if (!(this.precpred(this._ctx, 9))) {
							throw this.createFailedPredicateException("this.precpred(this._ctx, 9)");
						}
						this.state = 225;
						this.match(CSharpRoutineParser.EQUAL);
						this.state = 226;
						this.expression(10);
						}
						break;
					case 13:
						{
						localctx = new Expression_equality_not_eqContext(this, new ExpressionContext(this, _parentctx, _parentState));
						this.pushNewRecursionContext(localctx, _startState, CSharpRoutineParser.RULE_expression);
						this.state = 227;
						if (!(this.precpred(this._ctx, 8))) {
							throw this.createFailedPredicateException("this.precpred(this._ctx, 8)");
						}
						this.state = 228;
						this.match(CSharpRoutineParser.NOTEQUAL);
						this.state = 229;
						this.expression(9);
						}
						break;
					case 14:
						{
						localctx = new Expression_bitwise_andContext(this, new ExpressionContext(this, _parentctx, _parentState));
						this.pushNewRecursionContext(localctx, _startState, CSharpRoutineParser.RULE_expression);
						this.state = 230;
						if (!(this.precpred(this._ctx, 7))) {
							throw this.createFailedPredicateException("this.precpred(this._ctx, 7)");
						}
						this.state = 231;
						this.match(CSharpRoutineParser.BIT_AND);
						this.state = 232;
						this.expression(8);
						}
						break;
					case 15:
						{
						localctx = new Expression_bitwise_orContext(this, new ExpressionContext(this, _parentctx, _parentState));
						this.pushNewRecursionContext(localctx, _startState, CSharpRoutineParser.RULE_expression);
						this.state = 233;
						if (!(this.precpred(this._ctx, 6))) {
							throw this.createFailedPredicateException("this.precpred(this._ctx, 6)");
						}
						this.state = 234;
						this.match(CSharpRoutineParser.BIT_OR);
						this.state = 235;
						this.expression(7);
						}
						break;
					case 16:
						{
						localctx = new Expression_bitwise_xorContext(this, new ExpressionContext(this, _parentctx, _parentState));
						this.pushNewRecursionContext(localctx, _startState, CSharpRoutineParser.RULE_expression);
						this.state = 236;
						if (!(this.precpred(this._ctx, 5))) {
							throw this.createFailedPredicateException("this.precpred(this._ctx, 5)");
						}
						this.state = 237;
						this.match(CSharpRoutineParser.BIT_XOR);
						this.state = 238;
						this.expression(6);
						}
						break;
					case 17:
						{
						localctx = new Expression_logical_andContext(this, new ExpressionContext(this, _parentctx, _parentState));
						this.pushNewRecursionContext(localctx, _startState, CSharpRoutineParser.RULE_expression);
						this.state = 239;
						if (!(this.precpred(this._ctx, 4))) {
							throw this.createFailedPredicateException("this.precpred(this._ctx, 4)");
						}
						this.state = 240;
						this.match(CSharpRoutineParser.AND);
						this.state = 241;
						this.expression(5);
						}
						break;
					case 18:
						{
						localctx = new Expression_logical_orContext(this, new ExpressionContext(this, _parentctx, _parentState));
						this.pushNewRecursionContext(localctx, _startState, CSharpRoutineParser.RULE_expression);
						this.state = 242;
						if (!(this.precpred(this._ctx, 3))) {
							throw this.createFailedPredicateException("this.precpred(this._ctx, 3)");
						}
						this.state = 243;
						this.match(CSharpRoutineParser.OR);
						this.state = 244;
						this.expression(4);
						}
						break;
					case 19:
						{
						localctx = new Expression_ternaryContext(this, new ExpressionContext(this, _parentctx, _parentState));
						this.pushNewRecursionContext(localctx, _startState, CSharpRoutineParser.RULE_expression);
						this.state = 245;
						if (!(this.precpred(this._ctx, 2))) {
							throw this.createFailedPredicateException("this.precpred(this._ctx, 2)");
						}
						this.state = 246;
						this.match(CSharpRoutineParser.TERNARY);
						this.state = 247;
						this.expression(0);
						this.state = 248;
						this.match(CSharpRoutineParser.COLON);
						this.state = 249;
						this.expression(2);
						}
						break;
					case 20:
						{
						localctx = new Expression_assignmentContext(this, new ExpressionContext(this, _parentctx, _parentState));
						this.pushNewRecursionContext(localctx, _startState, CSharpRoutineParser.RULE_expression);
						this.state = 251;
						if (!(this.precpred(this._ctx, 1))) {
							throw this.createFailedPredicateException("this.precpred(this._ctx, 1)");
						}
						this.state = 252;
						this.assignment_operator();
						this.state = 253;
						this.expression(2);
						}
						break;
					case 21:
						{
						localctx = new Expression_postfix_inc_decContext(this, new ExpressionContext(this, _parentctx, _parentState));
						this.pushNewRecursionContext(localctx, _startState, CSharpRoutineParser.RULE_expression);
						this.state = 255;
						if (!(this.precpred(this._ctx, 24))) {
							throw this.createFailedPredicateException("this.precpred(this._ctx, 24)");
						}
						this.state = 256;
						_la = this._input.LA(1);
						if(!(_la===66 || _la===67)) {
						this._errHandler.recoverInline(this);
						}
						else {
							this._errHandler.reportMatch(this);
						    this.consume();
						}
						}
						break;
					case 22:
						{
						localctx = new Expression_postfix_array_accessContext(this, new ExpressionContext(this, _parentctx, _parentState));
						this.pushNewRecursionContext(localctx, _startState, CSharpRoutineParser.RULE_expression);
						this.state = 257;
						if (!(this.precpred(this._ctx, 23))) {
							throw this.createFailedPredicateException("this.precpred(this._ctx, 23)");
						}
						this.state = 258;
						this.match(CSharpRoutineParser.LBRACK);
						this.state = 259;
						this.expression(0);
						this.state = 260;
						this.match(CSharpRoutineParser.RBRACK);
						}
						break;
					case 23:
						{
						localctx = new Expression_postfix_invokeContext(this, new ExpressionContext(this, _parentctx, _parentState));
						this.pushNewRecursionContext(localctx, _startState, CSharpRoutineParser.RULE_expression);
						this.state = 262;
						if (!(this.precpred(this._ctx, 22))) {
							throw this.createFailedPredicateException("this.precpred(this._ctx, 22)");
						}
						this.state = 263;
						this.match(CSharpRoutineParser.LPAREN);
						this.state = 265;
						this._errHandler.sync(this);
						_la = this._input.LA(1);
						if ((((_la) & ~0x1F) === 0 && ((1 << _la) & 4261806080) !== 0) || ((((_la - 59)) & ~0x1F) === 0 && ((1 << (_la - 59)) & 34691) !== 0)) {
							{
							this.state = 264;
							this.expression_list();
							}
						}

						this.state = 267;
						this.match(CSharpRoutineParser.RPAREN);
						}
						break;
					}
					}
				}
				this.state = 272;
				this._errHandler.sync(this);
				_alt = this._interp.adaptivePredict(this._input, 18, this._ctx);
			}
			}
		}
		catch (re) {
			if (re instanceof RecognitionException) {
				localctx.exception = re;
				this._errHandler.reportError(this, re);
				this._errHandler.recover(this, re);
			} else {
				throw re;
			}
		}
		finally {
			this.unrollRecursionContexts(_parentctx);
		}
		return localctx;
	}
	// @RuleVersion(0)
	public assignment_operator(): Assignment_operatorContext {
		let localctx: Assignment_operatorContext = new Assignment_operatorContext(this, this._ctx, this.state);
		this.enterRule(localctx, 38, CSharpRoutineParser.RULE_assignment_operator);
		let _la: number;
		try {
			this.enterOuterAlt(localctx, 1);
			{
			this.state = 273;
			_la = this._input.LA(1);
			if(!(((((_la - 42)) & ~0x1F) === 0 && ((1 << (_la - 42)) & 2047) !== 0))) {
			this._errHandler.recoverInline(this);
			}
			else {
				this._errHandler.reportMatch(this);
			    this.consume();
			}
			}
		}
		catch (re) {
			if (re instanceof RecognitionException) {
				localctx.exception = re;
				this._errHandler.reportError(this, re);
				this._errHandler.recover(this, re);
			} else {
				throw re;
			}
		}
		finally {
			this.exitRule();
		}
		return localctx;
	}

	public type_(): TypeContext;
	public type_(_p: number): TypeContext;
	// @RuleVersion(0)
	public type_(_p?: number): TypeContext {
		if (_p === undefined) {
			_p = 0;
		}

		let _parentctx: ParserRuleContext = this._ctx;
		let _parentState: number = this.state;
		let localctx: TypeContext = new TypeContext(this, this._ctx, _parentState);
		let _prevctx: TypeContext = localctx;
		let _startState: number = 40;
		this.enterRecursionRule(localctx, 40, CSharpRoutineParser.RULE_type, _p);
		let _la: number;
		try {
			let _alt: number;
			this.enterOuterAlt(localctx, 1);
			{
			this.state = 291;
			this._errHandler.sync(this);
			switch (this._input.LA(1)) {
			case 1:
			case 2:
			case 3:
			case 4:
			case 5:
			case 6:
			case 7:
			case 8:
			case 9:
			case 10:
			case 11:
			case 12:
			case 13:
			case 14:
			case 15:
			case 16:
				{
				this.state = 276;
				this.primitive_type();
				}
				break;
			case 74:
				{
				this.state = 277;
				this.name();
				this.state = 289;
				this._errHandler.sync(this);
				switch ( this._interp.adaptivePredict(this._input, 20, this._ctx) ) {
				case 1:
					{
					this.state = 278;
					this.match(CSharpRoutineParser.LT);
					this.state = 279;
					this.type_(0);
					this.state = 284;
					this._errHandler.sync(this);
					_la = this._input.LA(1);
					while (_la===38) {
						{
						{
						this.state = 280;
						this.match(CSharpRoutineParser.COMMA);
						this.state = 281;
						this.type_(0);
						}
						}
						this.state = 286;
						this._errHandler.sync(this);
						_la = this._input.LA(1);
					}
					this.state = 287;
					this.match(CSharpRoutineParser.GT);
					}
					break;
				}
				}
				break;
			default:
				throw new NoViableAltException(this);
			}
			this._ctx.stop = this._input.LT(-1);
			this.state = 298;
			this._errHandler.sync(this);
			_alt = this._interp.adaptivePredict(this._input, 22, this._ctx);
			while (_alt !== 2 && _alt !== ATN.INVALID_ALT_NUMBER) {
				if (_alt === 1) {
					if (this._parseListeners != null) {
						this.triggerExitRuleEvent();
					}
					_prevctx = localctx;
					{
					{
					localctx = new TypeContext(this, _parentctx, _parentState);
					this.pushNewRecursionContext(localctx, _startState, CSharpRoutineParser.RULE_type);
					this.state = 293;
					if (!(this.precpred(this._ctx, 2))) {
						throw this.createFailedPredicateException("this.precpred(this._ctx, 2)");
					}
					this.state = 294;
					this.match(CSharpRoutineParser.LBRACK);
					this.state = 295;
					this.match(CSharpRoutineParser.RBRACK);
					}
					}
				}
				this.state = 300;
				this._errHandler.sync(this);
				_alt = this._interp.adaptivePredict(this._input, 22, this._ctx);
			}
			}
		}
		catch (re) {
			if (re instanceof RecognitionException) {
				localctx.exception = re;
				this._errHandler.reportError(this, re);
				this._errHandler.recover(this, re);
			} else {
				throw re;
			}
		}
		finally {
			this.unrollRecursionContexts(_parentctx);
		}
		return localctx;
	}
	// @RuleVersion(0)
	public primitive_type(): Primitive_typeContext {
		let localctx: Primitive_typeContext = new Primitive_typeContext(this, this._ctx, this.state);
		this.enterRule(localctx, 42, CSharpRoutineParser.RULE_primitive_type);
		let _la: number;
		try {
			this.enterOuterAlt(localctx, 1);
			{
			this.state = 301;
			_la = this._input.LA(1);
			if(!((((_la) & ~0x1F) === 0 && ((1 << _la) & 131070) !== 0))) {
			this._errHandler.recoverInline(this);
			}
			else {
				this._errHandler.reportMatch(this);
			    this.consume();
			}
			}
		}
		catch (re) {
			if (re instanceof RecognitionException) {
				localctx.exception = re;
				this._errHandler.reportError(this, re);
				this._errHandler.recover(this, re);
			} else {
				throw re;
			}
		}
		finally {
			this.exitRule();
		}
		return localctx;
	}
	// @RuleVersion(0)
	public name(): NameContext {
		let localctx: NameContext = new NameContext(this, this._ctx, this.state);
		this.enterRule(localctx, 44, CSharpRoutineParser.RULE_name);
		try {
			let _alt: number;
			this.enterOuterAlt(localctx, 1);
			{
			this.state = 303;
			this.match(CSharpRoutineParser.IDENTIFIER);
			this.state = 308;
			this._errHandler.sync(this);
			_alt = this._interp.adaptivePredict(this._input, 23, this._ctx);
			while (_alt !== 2 && _alt !== ATN.INVALID_ALT_NUMBER) {
				if (_alt === 1) {
					{
					{
					this.state = 304;
					this.match(CSharpRoutineParser.DOT);
					this.state = 305;
					this.match(CSharpRoutineParser.IDENTIFIER);
					}
					}
				}
				this.state = 310;
				this._errHandler.sync(this);
				_alt = this._interp.adaptivePredict(this._input, 23, this._ctx);
			}
			}
		}
		catch (re) {
			if (re instanceof RecognitionException) {
				localctx.exception = re;
				this._errHandler.reportError(this, re);
				this._errHandler.recover(this, re);
			} else {
				throw re;
			}
		}
		finally {
			this.exitRule();
		}
		return localctx;
	}
	// @RuleVersion(0)
	public flag_list(): Flag_listContext {
		let localctx: Flag_listContext = new Flag_listContext(this, this._ctx, this.state);
		this.enterRule(localctx, 46, CSharpRoutineParser.RULE_flag_list);
		let _la: number;
		try {
			this.enterOuterAlt(localctx, 1);
			{
			this.state = 311;
			this.match(CSharpRoutineParser.IDENTIFIER);
			this.state = 316;
			this._errHandler.sync(this);
			_la = this._input.LA(1);
			while (_la===38) {
				{
				{
				this.state = 312;
				this.match(CSharpRoutineParser.COMMA);
				this.state = 313;
				this.match(CSharpRoutineParser.IDENTIFIER);
				}
				}
				this.state = 318;
				this._errHandler.sync(this);
				_la = this._input.LA(1);
			}
			}
		}
		catch (re) {
			if (re instanceof RecognitionException) {
				localctx.exception = re;
				this._errHandler.reportError(this, re);
				this._errHandler.recover(this, re);
			} else {
				throw re;
			}
		}
		finally {
			this.exitRule();
		}
		return localctx;
	}
	// @RuleVersion(0)
	public literal(): LiteralContext {
		let localctx: LiteralContext = new LiteralContext(this, this._ctx, this.state);
		this.enterRule(localctx, 48, CSharpRoutineParser.RULE_literal);
		let _la: number;
		try {
			this.enterOuterAlt(localctx, 1);
			{
			this.state = 319;
			_la = this._input.LA(1);
			if(!((((_la) & ~0x1F) === 0 && ((1 << _la) & 2114322432) !== 0))) {
			this._errHandler.recoverInline(this);
			}
			else {
				this._errHandler.reportMatch(this);
			    this.consume();
			}
			}
		}
		catch (re) {
			if (re instanceof RecognitionException) {
				localctx.exception = re;
				this._errHandler.reportError(this, re);
				this._errHandler.recover(this, re);
			} else {
				throw re;
			}
		}
		finally {
			this.exitRule();
		}
		return localctx;
	}

	public sempred(localctx: RuleContext, ruleIndex: number, predIndex: number): boolean {
		switch (ruleIndex) {
		case 18:
			return this.expression_sempred(localctx as ExpressionContext, predIndex);
		case 20:
			return this.type_sempred(localctx as TypeContext, predIndex);
		}
		return true;
	}
	private expression_sempred(localctx: ExpressionContext, predIndex: number): boolean {
		switch (predIndex) {
		case 0:
			return this.precpred(this._ctx, 20);
		case 1:
			return this.precpred(this._ctx, 19);
		case 2:
			return this.precpred(this._ctx, 18);
		case 3:
			return this.precpred(this._ctx, 17);
		case 4:
			return this.precpred(this._ctx, 16);
		case 5:
			return this.precpred(this._ctx, 15);
		case 6:
			return this.precpred(this._ctx, 14);
		case 7:
			return this.precpred(this._ctx, 13);
		case 8:
			return this.precpred(this._ctx, 12);
		case 9:
			return this.precpred(this._ctx, 11);
		case 10:
			return this.precpred(this._ctx, 10);
		case 11:
			return this.precpred(this._ctx, 9);
		case 12:
			return this.precpred(this._ctx, 8);
		case 13:
			return this.precpred(this._ctx, 7);
		case 14:
			return this.precpred(this._ctx, 6);
		case 15:
			return this.precpred(this._ctx, 5);
		case 16:
			return this.precpred(this._ctx, 4);
		case 17:
			return this.precpred(this._ctx, 3);
		case 18:
			return this.precpred(this._ctx, 2);
		case 19:
			return this.precpred(this._ctx, 1);
		case 20:
			return this.precpred(this._ctx, 24);
		case 21:
			return this.precpred(this._ctx, 23);
		case 22:
			return this.precpred(this._ctx, 22);
		}
		return true;
	}
	private type_sempred(localctx: TypeContext, predIndex: number): boolean {
		switch (predIndex) {
		case 23:
			return this.precpred(this._ctx, 2);
		}
		return true;
	}

	public static readonly _serializedATN: number[] = [4,1,77,322,2,0,7,0,2,
	1,7,1,2,2,7,2,2,3,7,3,2,4,7,4,2,5,7,5,2,6,7,6,2,7,7,7,2,8,7,8,2,9,7,9,2,
	10,7,10,2,11,7,11,2,12,7,12,2,13,7,13,2,14,7,14,2,15,7,15,2,16,7,16,2,17,
	7,17,2,18,7,18,2,19,7,19,2,20,7,20,2,21,7,21,2,22,7,22,2,23,7,23,2,24,7,
	24,1,0,5,0,52,8,0,10,0,12,0,55,9,0,1,0,1,0,1,1,1,1,1,1,1,1,1,2,1,2,3,2,
	65,8,2,1,2,1,2,1,3,1,3,3,3,71,8,3,1,3,1,3,1,4,5,4,76,8,4,10,4,12,4,79,9,
	4,1,5,1,5,1,5,1,5,1,5,1,5,3,5,87,8,5,1,6,1,6,3,6,91,8,6,1,6,1,6,1,7,4,7,
	96,8,7,11,7,12,7,97,1,8,1,8,1,8,1,9,1,9,1,9,1,9,1,9,1,9,1,9,3,9,110,8,9,
	1,10,1,10,1,10,1,10,1,10,1,10,1,11,1,11,5,11,120,8,11,10,11,12,11,123,9,
	11,1,11,1,11,1,12,1,12,1,12,1,12,5,12,131,8,12,10,12,12,12,134,9,12,1,12,
	1,12,1,12,5,12,139,8,12,10,12,12,12,142,9,12,3,12,144,8,12,1,13,1,13,1,
	13,1,13,1,14,1,14,1,14,3,14,153,8,14,1,15,1,15,1,16,1,16,1,16,1,17,1,17,
	1,17,5,17,163,8,17,10,17,12,17,166,9,17,1,18,1,18,1,18,1,18,1,18,1,18,1,
	18,1,18,1,18,1,18,1,18,1,18,1,18,1,18,1,18,1,18,1,18,3,18,185,8,18,1,18,
	3,18,188,8,18,1,18,1,18,1,18,1,18,1,18,1,18,1,18,1,18,1,18,1,18,1,18,1,
	18,1,18,1,18,1,18,1,18,1,18,1,18,1,18,1,18,1,18,1,18,1,18,1,18,1,18,1,18,
	1,18,1,18,1,18,1,18,1,18,1,18,1,18,1,18,1,18,1,18,1,18,1,18,1,18,1,18,1,
	18,1,18,1,18,1,18,1,18,1,18,1,18,1,18,1,18,1,18,1,18,1,18,1,18,1,18,1,18,
	1,18,1,18,1,18,1,18,1,18,1,18,1,18,1,18,1,18,1,18,1,18,1,18,1,18,1,18,1,
	18,1,18,1,18,1,18,1,18,1,18,1,18,3,18,266,8,18,1,18,5,18,269,8,18,10,18,
	12,18,272,9,18,1,19,1,19,1,20,1,20,1,20,1,20,1,20,1,20,1,20,5,20,283,8,
	20,10,20,12,20,286,9,20,1,20,1,20,3,20,290,8,20,3,20,292,8,20,1,20,1,20,
	1,20,5,20,297,8,20,10,20,12,20,300,9,20,1,21,1,21,1,22,1,22,1,22,5,22,307,
	8,22,10,22,12,22,310,9,22,1,23,1,23,1,23,5,23,315,8,23,10,23,12,23,318,
	9,23,1,24,1,24,1,24,0,2,36,40,25,0,2,4,6,8,10,12,14,16,18,20,22,24,26,28,
	30,32,34,36,38,40,42,44,46,48,0,4,1,0,66,67,1,0,42,52,1,0,1,16,2,0,17,18,
	25,30,353,0,53,1,0,0,0,2,58,1,0,0,0,4,62,1,0,0,0,6,68,1,0,0,0,8,77,1,0,
	0,0,10,86,1,0,0,0,12,88,1,0,0,0,14,95,1,0,0,0,16,99,1,0,0,0,18,102,1,0,
	0,0,20,111,1,0,0,0,22,117,1,0,0,0,24,143,1,0,0,0,26,145,1,0,0,0,28,149,
	1,0,0,0,30,154,1,0,0,0,32,156,1,0,0,0,34,159,1,0,0,0,36,187,1,0,0,0,38,
	273,1,0,0,0,40,291,1,0,0,0,42,301,1,0,0,0,44,303,1,0,0,0,46,311,1,0,0,0,
	48,319,1,0,0,0,50,52,3,2,1,0,51,50,1,0,0,0,52,55,1,0,0,0,53,51,1,0,0,0,
	53,54,1,0,0,0,54,56,1,0,0,0,55,53,1,0,0,0,56,57,5,0,0,1,57,1,1,0,0,0,58,
	59,3,4,2,0,59,60,3,8,4,0,60,61,3,6,3,0,61,3,1,0,0,0,62,64,5,54,0,0,63,65,
	3,46,23,0,64,63,1,0,0,0,64,65,1,0,0,0,65,66,1,0,0,0,66,67,5,69,0,0,67,5,
	1,0,0,0,68,70,5,69,0,0,69,71,3,46,23,0,70,69,1,0,0,0,70,71,1,0,0,0,71,72,
	1,0,0,0,72,73,5,53,0,0,73,7,1,0,0,0,74,76,3,10,5,0,75,74,1,0,0,0,76,79,
	1,0,0,0,77,75,1,0,0,0,77,78,1,0,0,0,78,9,1,0,0,0,79,77,1,0,0,0,80,87,3,
	18,9,0,81,87,3,20,10,0,82,87,3,12,6,0,83,87,3,16,8,0,84,87,3,26,13,0,85,
	87,3,32,16,0,86,80,1,0,0,0,86,81,1,0,0,0,86,82,1,0,0,0,86,83,1,0,0,0,86,
	84,1,0,0,0,86,85,1,0,0,0,87,11,1,0,0,0,88,90,5,33,0,0,89,91,3,14,7,0,90,
	89,1,0,0,0,90,91,1,0,0,0,91,92,1,0,0,0,92,93,5,34,0,0,93,13,1,0,0,0,94,
	96,3,10,5,0,95,94,1,0,0,0,96,97,1,0,0,0,97,95,1,0,0,0,97,98,1,0,0,0,98,
	15,1,0,0,0,99,100,3,36,18,0,100,101,5,37,0,0,101,17,1,0,0,0,102,103,5,22,
	0,0,103,104,5,31,0,0,104,105,3,36,18,0,105,106,5,32,0,0,106,109,3,10,5,
	0,107,108,5,23,0,0,108,110,3,10,5,0,109,107,1,0,0,0,109,110,1,0,0,0,110,
	19,1,0,0,0,111,112,5,24,0,0,112,113,5,31,0,0,113,114,3,36,18,0,114,115,
	5,32,0,0,115,116,3,22,11,0,116,21,1,0,0,0,117,121,5,33,0,0,118,120,3,24,
	12,0,119,118,1,0,0,0,120,123,1,0,0,0,121,119,1,0,0,0,121,122,1,0,0,0,122,
	124,1,0,0,0,123,121,1,0,0,0,124,125,5,34,0,0,125,23,1,0,0,0,126,127,5,20,
	0,0,127,128,3,36,18,0,128,132,5,40,0,0,129,131,3,10,5,0,130,129,1,0,0,0,
	131,134,1,0,0,0,132,130,1,0,0,0,132,133,1,0,0,0,133,144,1,0,0,0,134,132,
	1,0,0,0,135,136,5,21,0,0,136,140,5,40,0,0,137,139,3,10,5,0,138,137,1,0,
	0,0,139,142,1,0,0,0,140,138,1,0,0,0,140,141,1,0,0,0,141,144,1,0,0,0,142,
	140,1,0,0,0,143,126,1,0,0,0,143,135,1,0,0,0,144,25,1,0,0,0,145,146,3,40,
	20,0,146,147,3,28,14,0,147,148,5,37,0,0,148,27,1,0,0,0,149,152,3,30,15,
	0,150,151,5,42,0,0,151,153,3,36,18,0,152,150,1,0,0,0,152,153,1,0,0,0,153,
	29,1,0,0,0,154,155,5,74,0,0,155,31,1,0,0,0,156,157,5,19,0,0,157,158,5,37,
	0,0,158,33,1,0,0,0,159,164,3,36,18,0,160,161,5,38,0,0,161,163,3,36,18,0,
	162,160,1,0,0,0,163,166,1,0,0,0,164,162,1,0,0,0,164,165,1,0,0,0,165,35,
	1,0,0,0,166,164,1,0,0,0,167,168,6,18,-1,0,168,188,3,44,22,0,169,188,3,48,
	24,0,170,171,5,31,0,0,171,172,3,36,18,0,172,173,5,32,0,0,173,188,1,0,0,
	0,174,185,5,69,0,0,175,185,5,68,0,0,176,185,5,59,0,0,177,185,5,60,0,0,178,
	185,5,67,0,0,179,185,5,66,0,0,180,181,5,31,0,0,181,182,3,40,20,0,182,183,
	5,32,0,0,183,185,1,0,0,0,184,174,1,0,0,0,184,175,1,0,0,0,184,176,1,0,0,
	0,184,177,1,0,0,0,184,178,1,0,0,0,184,179,1,0,0,0,184,180,1,0,0,0,185,186,
	1,0,0,0,186,188,3,36,18,21,187,167,1,0,0,0,187,169,1,0,0,0,187,170,1,0,
	0,0,187,184,1,0,0,0,188,270,1,0,0,0,189,190,10,20,0,0,190,191,5,70,0,0,
	191,269,3,36,18,21,192,193,10,19,0,0,193,194,5,71,0,0,194,269,3,36,18,20,
	195,196,10,18,0,0,196,197,5,72,0,0,197,269,3,36,18,19,198,199,10,17,0,0,
	199,200,5,68,0,0,200,269,3,36,18,18,201,202,10,16,0,0,202,203,5,69,0,0,
	203,269,3,36,18,17,204,205,10,15,0,0,205,206,5,54,0,0,206,207,5,54,0,0,
	207,269,3,36,18,16,208,209,10,14,0,0,209,210,5,53,0,0,210,211,5,53,0,0,
	211,269,3,36,18,15,212,213,10,13,0,0,213,214,5,54,0,0,214,269,3,36,18,14,
	215,216,10,12,0,0,216,217,5,53,0,0,217,269,3,36,18,13,218,219,10,11,0,0,
	219,220,5,56,0,0,220,269,3,36,18,12,221,222,10,10,0,0,222,223,5,57,0,0,
	223,269,3,36,18,11,224,225,10,9,0,0,225,226,5,55,0,0,226,269,3,36,18,10,
	227,228,10,8,0,0,228,229,5,58,0,0,229,269,3,36,18,9,230,231,10,7,0,0,231,
	232,5,61,0,0,232,269,3,36,18,8,233,234,10,6,0,0,234,235,5,62,0,0,235,269,
	3,36,18,7,236,237,10,5,0,0,237,238,5,63,0,0,238,269,3,36,18,6,239,240,10,
	4,0,0,240,241,5,64,0,0,241,269,3,36,18,5,242,243,10,3,0,0,243,244,5,65,
	0,0,244,269,3,36,18,4,245,246,10,2,0,0,246,247,5,73,0,0,247,248,3,36,18,
	0,248,249,5,40,0,0,249,250,3,36,18,2,250,269,1,0,0,0,251,252,10,1,0,0,252,
	253,3,38,19,0,253,254,3,36,18,2,254,269,1,0,0,0,255,256,10,24,0,0,256,269,
	7,0,0,0,257,258,10,23,0,0,258,259,5,35,0,0,259,260,3,36,18,0,260,261,5,
	36,0,0,261,269,1,0,0,0,262,263,10,22,0,0,263,265,5,31,0,0,264,266,3,34,
	17,0,265,264,1,0,0,0,265,266,1,0,0,0,266,267,1,0,0,0,267,269,5,32,0,0,268,
	189,1,0,0,0,268,192,1,0,0,0,268,195,1,0,0,0,268,198,1,0,0,0,268,201,1,0,
	0,0,268,204,1,0,0,0,268,208,1,0,0,0,268,212,1,0,0,0,268,215,1,0,0,0,268,
	218,1,0,0,0,268,221,1,0,0,0,268,224,1,0,0,0,268,227,1,0,0,0,268,230,1,0,
	0,0,268,233,1,0,0,0,268,236,1,0,0,0,268,239,1,0,0,0,268,242,1,0,0,0,268,
	245,1,0,0,0,268,251,1,0,0,0,268,255,1,0,0,0,268,257,1,0,0,0,268,262,1,0,
	0,0,269,272,1,0,0,0,270,268,1,0,0,0,270,271,1,0,0,0,271,37,1,0,0,0,272,
	270,1,0,0,0,273,274,7,1,0,0,274,39,1,0,0,0,275,276,6,20,-1,0,276,292,3,
	42,21,0,277,289,3,44,22,0,278,279,5,54,0,0,279,284,3,40,20,0,280,281,5,
	38,0,0,281,283,3,40,20,0,282,280,1,0,0,0,283,286,1,0,0,0,284,282,1,0,0,
	0,284,285,1,0,0,0,285,287,1,0,0,0,286,284,1,0,0,0,287,288,5,53,0,0,288,
	290,1,0,0,0,289,278,1,0,0,0,289,290,1,0,0,0,290,292,1,0,0,0,291,275,1,0,
	0,0,291,277,1,0,0,0,292,298,1,0,0,0,293,294,10,2,0,0,294,295,5,35,0,0,295,
	297,5,36,0,0,296,293,1,0,0,0,297,300,1,0,0,0,298,296,1,0,0,0,298,299,1,
	0,0,0,299,41,1,0,0,0,300,298,1,0,0,0,301,302,7,2,0,0,302,43,1,0,0,0,303,
	308,5,74,0,0,304,305,5,39,0,0,305,307,5,74,0,0,306,304,1,0,0,0,307,310,
	1,0,0,0,308,306,1,0,0,0,308,309,1,0,0,0,309,45,1,0,0,0,310,308,1,0,0,0,
	311,316,5,74,0,0,312,313,5,38,0,0,313,315,5,74,0,0,314,312,1,0,0,0,315,
	318,1,0,0,0,316,314,1,0,0,0,316,317,1,0,0,0,317,47,1,0,0,0,318,316,1,0,
	0,0,319,320,7,3,0,0,320,49,1,0,0,0,25,53,64,70,77,86,90,97,109,121,132,
	140,143,152,164,184,187,265,268,270,284,289,291,298,308,316];

	private static __ATN: ATN;
	public static get _ATN(): ATN {
		if (!CSharpRoutineParser.__ATN) {
			CSharpRoutineParser.__ATN = new ATNDeserializer().deserialize(CSharpRoutineParser._serializedATN);
		}

		return CSharpRoutineParser.__ATN;
	}


	static DecisionsToDFA = CSharpRoutineParser._ATN.decisionToState.map( (ds: DecisionState, index: number) => new DFA(ds, index) );

}

export class RoutineContext extends ParserRuleContext {
	constructor(parser?: CSharpRoutineParser, parent?: ParserRuleContext, invokingState?: number) {
		super(parent, invokingState);
    	this.parser = parser;
	}
	public EOF(): TerminalNode {
		return this.getToken(CSharpRoutineParser.EOF, 0);
	}
	public scheduled_block_list(): Scheduled_blockContext[] {
		return this.getTypedRuleContexts(Scheduled_blockContext) as Scheduled_blockContext[];
	}
	public scheduled_block(i: number): Scheduled_blockContext {
		return this.getTypedRuleContext(Scheduled_blockContext, i) as Scheduled_blockContext;
	}
    public get ruleIndex(): number {
    	return CSharpRoutineParser.RULE_routine;
	}
	public enterRule(listener: CSharpRoutineParserListener): void {
	    if(listener.enterRoutine) {
	 		listener.enterRoutine(this);
		}
	}
	public exitRule(listener: CSharpRoutineParserListener): void {
	    if(listener.exitRoutine) {
	 		listener.exitRoutine(this);
		}
	}
}


export class Scheduled_blockContext extends ParserRuleContext {
	constructor(parser?: CSharpRoutineParser, parent?: ParserRuleContext, invokingState?: number) {
		super(parent, invokingState);
    	this.parser = parser;
	}
	public scheduled_block_open(): Scheduled_block_openContext {
		return this.getTypedRuleContext(Scheduled_block_openContext, 0) as Scheduled_block_openContext;
	}
	public block(): BlockContext {
		return this.getTypedRuleContext(BlockContext, 0) as BlockContext;
	}
	public scheduled_block_close(): Scheduled_block_closeContext {
		return this.getTypedRuleContext(Scheduled_block_closeContext, 0) as Scheduled_block_closeContext;
	}
    public get ruleIndex(): number {
    	return CSharpRoutineParser.RULE_scheduled_block;
	}
	public enterRule(listener: CSharpRoutineParserListener): void {
	    if(listener.enterScheduled_block) {
	 		listener.enterScheduled_block(this);
		}
	}
	public exitRule(listener: CSharpRoutineParserListener): void {
	    if(listener.exitScheduled_block) {
	 		listener.exitScheduled_block(this);
		}
	}
}


export class Scheduled_block_openContext extends ParserRuleContext {
	constructor(parser?: CSharpRoutineParser, parent?: ParserRuleContext, invokingState?: number) {
		super(parent, invokingState);
    	this.parser = parser;
	}
	public LT(): TerminalNode {
		return this.getToken(CSharpRoutineParser.LT, 0);
	}
	public SUB(): TerminalNode {
		return this.getToken(CSharpRoutineParser.SUB, 0);
	}
	public flag_list(): Flag_listContext {
		return this.getTypedRuleContext(Flag_listContext, 0) as Flag_listContext;
	}
    public get ruleIndex(): number {
    	return CSharpRoutineParser.RULE_scheduled_block_open;
	}
	public enterRule(listener: CSharpRoutineParserListener): void {
	    if(listener.enterScheduled_block_open) {
	 		listener.enterScheduled_block_open(this);
		}
	}
	public exitRule(listener: CSharpRoutineParserListener): void {
	    if(listener.exitScheduled_block_open) {
	 		listener.exitScheduled_block_open(this);
		}
	}
}


export class Scheduled_block_closeContext extends ParserRuleContext {
	constructor(parser?: CSharpRoutineParser, parent?: ParserRuleContext, invokingState?: number) {
		super(parent, invokingState);
    	this.parser = parser;
	}
	public SUB(): TerminalNode {
		return this.getToken(CSharpRoutineParser.SUB, 0);
	}
	public GT(): TerminalNode {
		return this.getToken(CSharpRoutineParser.GT, 0);
	}
	public flag_list(): Flag_listContext {
		return this.getTypedRuleContext(Flag_listContext, 0) as Flag_listContext;
	}
    public get ruleIndex(): number {
    	return CSharpRoutineParser.RULE_scheduled_block_close;
	}
	public enterRule(listener: CSharpRoutineParserListener): void {
	    if(listener.enterScheduled_block_close) {
	 		listener.enterScheduled_block_close(this);
		}
	}
	public exitRule(listener: CSharpRoutineParserListener): void {
	    if(listener.exitScheduled_block_close) {
	 		listener.exitScheduled_block_close(this);
		}
	}
}


export class BlockContext extends ParserRuleContext {
	constructor(parser?: CSharpRoutineParser, parent?: ParserRuleContext, invokingState?: number) {
		super(parent, invokingState);
    	this.parser = parser;
	}
	public statement_list(): StatementContext[] {
		return this.getTypedRuleContexts(StatementContext) as StatementContext[];
	}
	public statement(i: number): StatementContext {
		return this.getTypedRuleContext(StatementContext, i) as StatementContext;
	}
    public get ruleIndex(): number {
    	return CSharpRoutineParser.RULE_block;
	}
	public enterRule(listener: CSharpRoutineParserListener): void {
	    if(listener.enterBlock) {
	 		listener.enterBlock(this);
		}
	}
	public exitRule(listener: CSharpRoutineParserListener): void {
	    if(listener.exitBlock) {
	 		listener.exitBlock(this);
		}
	}
}


export class StatementContext extends ParserRuleContext {
	constructor(parser?: CSharpRoutineParser, parent?: ParserRuleContext, invokingState?: number) {
		super(parent, invokingState);
    	this.parser = parser;
	}
	public if_statement(): If_statementContext {
		return this.getTypedRuleContext(If_statementContext, 0) as If_statementContext;
	}
	public switch_statement(): Switch_statementContext {
		return this.getTypedRuleContext(Switch_statementContext, 0) as Switch_statementContext;
	}
	public compound_statement(): Compound_statementContext {
		return this.getTypedRuleContext(Compound_statementContext, 0) as Compound_statementContext;
	}
	public expression_statement(): Expression_statementContext {
		return this.getTypedRuleContext(Expression_statementContext, 0) as Expression_statementContext;
	}
	public declaration_statement(): Declaration_statementContext {
		return this.getTypedRuleContext(Declaration_statementContext, 0) as Declaration_statementContext;
	}
	public break_statement(): Break_statementContext {
		return this.getTypedRuleContext(Break_statementContext, 0) as Break_statementContext;
	}
    public get ruleIndex(): number {
    	return CSharpRoutineParser.RULE_statement;
	}
	public enterRule(listener: CSharpRoutineParserListener): void {
	    if(listener.enterStatement) {
	 		listener.enterStatement(this);
		}
	}
	public exitRule(listener: CSharpRoutineParserListener): void {
	    if(listener.exitStatement) {
	 		listener.exitStatement(this);
		}
	}
}


export class Compound_statementContext extends ParserRuleContext {
	constructor(parser?: CSharpRoutineParser, parent?: ParserRuleContext, invokingState?: number) {
		super(parent, invokingState);
    	this.parser = parser;
	}
	public LBRACE(): TerminalNode {
		return this.getToken(CSharpRoutineParser.LBRACE, 0);
	}
	public RBRACE(): TerminalNode {
		return this.getToken(CSharpRoutineParser.RBRACE, 0);
	}
	public statement_list(): Statement_listContext {
		return this.getTypedRuleContext(Statement_listContext, 0) as Statement_listContext;
	}
    public get ruleIndex(): number {
    	return CSharpRoutineParser.RULE_compound_statement;
	}
	public enterRule(listener: CSharpRoutineParserListener): void {
	    if(listener.enterCompound_statement) {
	 		listener.enterCompound_statement(this);
		}
	}
	public exitRule(listener: CSharpRoutineParserListener): void {
	    if(listener.exitCompound_statement) {
	 		listener.exitCompound_statement(this);
		}
	}
}


export class Statement_listContext extends ParserRuleContext {
	constructor(parser?: CSharpRoutineParser, parent?: ParserRuleContext, invokingState?: number) {
		super(parent, invokingState);
    	this.parser = parser;
	}
	public statement_list(): StatementContext[] {
		return this.getTypedRuleContexts(StatementContext) as StatementContext[];
	}
	public statement(i: number): StatementContext {
		return this.getTypedRuleContext(StatementContext, i) as StatementContext;
	}
    public get ruleIndex(): number {
    	return CSharpRoutineParser.RULE_statement_list;
	}
	public enterRule(listener: CSharpRoutineParserListener): void {
	    if(listener.enterStatement_list) {
	 		listener.enterStatement_list(this);
		}
	}
	public exitRule(listener: CSharpRoutineParserListener): void {
	    if(listener.exitStatement_list) {
	 		listener.exitStatement_list(this);
		}
	}
}


export class Expression_statementContext extends ParserRuleContext {
	constructor(parser?: CSharpRoutineParser, parent?: ParserRuleContext, invokingState?: number) {
		super(parent, invokingState);
    	this.parser = parser;
	}
	public expression(): ExpressionContext {
		return this.getTypedRuleContext(ExpressionContext, 0) as ExpressionContext;
	}
	public SEMI(): TerminalNode {
		return this.getToken(CSharpRoutineParser.SEMI, 0);
	}
    public get ruleIndex(): number {
    	return CSharpRoutineParser.RULE_expression_statement;
	}
	public enterRule(listener: CSharpRoutineParserListener): void {
	    if(listener.enterExpression_statement) {
	 		listener.enterExpression_statement(this);
		}
	}
	public exitRule(listener: CSharpRoutineParserListener): void {
	    if(listener.exitExpression_statement) {
	 		listener.exitExpression_statement(this);
		}
	}
}


export class If_statementContext extends ParserRuleContext {
	constructor(parser?: CSharpRoutineParser, parent?: ParserRuleContext, invokingState?: number) {
		super(parent, invokingState);
    	this.parser = parser;
	}
	public IF(): TerminalNode {
		return this.getToken(CSharpRoutineParser.IF, 0);
	}
	public LPAREN(): TerminalNode {
		return this.getToken(CSharpRoutineParser.LPAREN, 0);
	}
	public expression(): ExpressionContext {
		return this.getTypedRuleContext(ExpressionContext, 0) as ExpressionContext;
	}
	public RPAREN(): TerminalNode {
		return this.getToken(CSharpRoutineParser.RPAREN, 0);
	}
	public statement_list(): StatementContext[] {
		return this.getTypedRuleContexts(StatementContext) as StatementContext[];
	}
	public statement(i: number): StatementContext {
		return this.getTypedRuleContext(StatementContext, i) as StatementContext;
	}
	public ELSE(): TerminalNode {
		return this.getToken(CSharpRoutineParser.ELSE, 0);
	}
    public get ruleIndex(): number {
    	return CSharpRoutineParser.RULE_if_statement;
	}
	public enterRule(listener: CSharpRoutineParserListener): void {
	    if(listener.enterIf_statement) {
	 		listener.enterIf_statement(this);
		}
	}
	public exitRule(listener: CSharpRoutineParserListener): void {
	    if(listener.exitIf_statement) {
	 		listener.exitIf_statement(this);
		}
	}
}


export class Switch_statementContext extends ParserRuleContext {
	constructor(parser?: CSharpRoutineParser, parent?: ParserRuleContext, invokingState?: number) {
		super(parent, invokingState);
    	this.parser = parser;
	}
	public SWITCH(): TerminalNode {
		return this.getToken(CSharpRoutineParser.SWITCH, 0);
	}
	public LPAREN(): TerminalNode {
		return this.getToken(CSharpRoutineParser.LPAREN, 0);
	}
	public expression(): ExpressionContext {
		return this.getTypedRuleContext(ExpressionContext, 0) as ExpressionContext;
	}
	public RPAREN(): TerminalNode {
		return this.getToken(CSharpRoutineParser.RPAREN, 0);
	}
	public switch_block(): Switch_blockContext {
		return this.getTypedRuleContext(Switch_blockContext, 0) as Switch_blockContext;
	}
    public get ruleIndex(): number {
    	return CSharpRoutineParser.RULE_switch_statement;
	}
	public enterRule(listener: CSharpRoutineParserListener): void {
	    if(listener.enterSwitch_statement) {
	 		listener.enterSwitch_statement(this);
		}
	}
	public exitRule(listener: CSharpRoutineParserListener): void {
	    if(listener.exitSwitch_statement) {
	 		listener.exitSwitch_statement(this);
		}
	}
}


export class Switch_blockContext extends ParserRuleContext {
	constructor(parser?: CSharpRoutineParser, parent?: ParserRuleContext, invokingState?: number) {
		super(parent, invokingState);
    	this.parser = parser;
	}
	public LBRACE(): TerminalNode {
		return this.getToken(CSharpRoutineParser.LBRACE, 0);
	}
	public RBRACE(): TerminalNode {
		return this.getToken(CSharpRoutineParser.RBRACE, 0);
	}
	public switch_label_list(): Switch_labelContext[] {
		return this.getTypedRuleContexts(Switch_labelContext) as Switch_labelContext[];
	}
	public switch_label(i: number): Switch_labelContext {
		return this.getTypedRuleContext(Switch_labelContext, i) as Switch_labelContext;
	}
    public get ruleIndex(): number {
    	return CSharpRoutineParser.RULE_switch_block;
	}
	public enterRule(listener: CSharpRoutineParserListener): void {
	    if(listener.enterSwitch_block) {
	 		listener.enterSwitch_block(this);
		}
	}
	public exitRule(listener: CSharpRoutineParserListener): void {
	    if(listener.exitSwitch_block) {
	 		listener.exitSwitch_block(this);
		}
	}
}


export class Switch_labelContext extends ParserRuleContext {
	constructor(parser?: CSharpRoutineParser, parent?: ParserRuleContext, invokingState?: number) {
		super(parent, invokingState);
    	this.parser = parser;
	}
	public CASE(): TerminalNode {
		return this.getToken(CSharpRoutineParser.CASE, 0);
	}
	public expression(): ExpressionContext {
		return this.getTypedRuleContext(ExpressionContext, 0) as ExpressionContext;
	}
	public COLON(): TerminalNode {
		return this.getToken(CSharpRoutineParser.COLON, 0);
	}
	public statement_list(): StatementContext[] {
		return this.getTypedRuleContexts(StatementContext) as StatementContext[];
	}
	public statement(i: number): StatementContext {
		return this.getTypedRuleContext(StatementContext, i) as StatementContext;
	}
	public DEFAULT(): TerminalNode {
		return this.getToken(CSharpRoutineParser.DEFAULT, 0);
	}
    public get ruleIndex(): number {
    	return CSharpRoutineParser.RULE_switch_label;
	}
	public enterRule(listener: CSharpRoutineParserListener): void {
	    if(listener.enterSwitch_label) {
	 		listener.enterSwitch_label(this);
		}
	}
	public exitRule(listener: CSharpRoutineParserListener): void {
	    if(listener.exitSwitch_label) {
	 		listener.exitSwitch_label(this);
		}
	}
}


export class Declaration_statementContext extends ParserRuleContext {
	constructor(parser?: CSharpRoutineParser, parent?: ParserRuleContext, invokingState?: number) {
		super(parent, invokingState);
    	this.parser = parser;
	}
	public type_(): TypeContext {
		return this.getTypedRuleContext(TypeContext, 0) as TypeContext;
	}
	public declarator_init(): Declarator_initContext {
		return this.getTypedRuleContext(Declarator_initContext, 0) as Declarator_initContext;
	}
	public SEMI(): TerminalNode {
		return this.getToken(CSharpRoutineParser.SEMI, 0);
	}
    public get ruleIndex(): number {
    	return CSharpRoutineParser.RULE_declaration_statement;
	}
	public enterRule(listener: CSharpRoutineParserListener): void {
	    if(listener.enterDeclaration_statement) {
	 		listener.enterDeclaration_statement(this);
		}
	}
	public exitRule(listener: CSharpRoutineParserListener): void {
	    if(listener.exitDeclaration_statement) {
	 		listener.exitDeclaration_statement(this);
		}
	}
}


export class Declarator_initContext extends ParserRuleContext {
	constructor(parser?: CSharpRoutineParser, parent?: ParserRuleContext, invokingState?: number) {
		super(parent, invokingState);
    	this.parser = parser;
	}
	public declarator(): DeclaratorContext {
		return this.getTypedRuleContext(DeclaratorContext, 0) as DeclaratorContext;
	}
	public ASSIGN(): TerminalNode {
		return this.getToken(CSharpRoutineParser.ASSIGN, 0);
	}
	public expression(): ExpressionContext {
		return this.getTypedRuleContext(ExpressionContext, 0) as ExpressionContext;
	}
    public get ruleIndex(): number {
    	return CSharpRoutineParser.RULE_declarator_init;
	}
	public enterRule(listener: CSharpRoutineParserListener): void {
	    if(listener.enterDeclarator_init) {
	 		listener.enterDeclarator_init(this);
		}
	}
	public exitRule(listener: CSharpRoutineParserListener): void {
	    if(listener.exitDeclarator_init) {
	 		listener.exitDeclarator_init(this);
		}
	}
}


export class DeclaratorContext extends ParserRuleContext {
	constructor(parser?: CSharpRoutineParser, parent?: ParserRuleContext, invokingState?: number) {
		super(parent, invokingState);
    	this.parser = parser;
	}
	public IDENTIFIER(): TerminalNode {
		return this.getToken(CSharpRoutineParser.IDENTIFIER, 0);
	}
    public get ruleIndex(): number {
    	return CSharpRoutineParser.RULE_declarator;
	}
	public enterRule(listener: CSharpRoutineParserListener): void {
	    if(listener.enterDeclarator) {
	 		listener.enterDeclarator(this);
		}
	}
	public exitRule(listener: CSharpRoutineParserListener): void {
	    if(listener.exitDeclarator) {
	 		listener.exitDeclarator(this);
		}
	}
}


export class Break_statementContext extends ParserRuleContext {
	constructor(parser?: CSharpRoutineParser, parent?: ParserRuleContext, invokingState?: number) {
		super(parent, invokingState);
    	this.parser = parser;
	}
	public BREAK(): TerminalNode {
		return this.getToken(CSharpRoutineParser.BREAK, 0);
	}
	public SEMI(): TerminalNode {
		return this.getToken(CSharpRoutineParser.SEMI, 0);
	}
    public get ruleIndex(): number {
    	return CSharpRoutineParser.RULE_break_statement;
	}
	public enterRule(listener: CSharpRoutineParserListener): void {
	    if(listener.enterBreak_statement) {
	 		listener.enterBreak_statement(this);
		}
	}
	public exitRule(listener: CSharpRoutineParserListener): void {
	    if(listener.exitBreak_statement) {
	 		listener.exitBreak_statement(this);
		}
	}
}


export class Expression_listContext extends ParserRuleContext {
	constructor(parser?: CSharpRoutineParser, parent?: ParserRuleContext, invokingState?: number) {
		super(parent, invokingState);
    	this.parser = parser;
	}
	public expression_list(): ExpressionContext[] {
		return this.getTypedRuleContexts(ExpressionContext) as ExpressionContext[];
	}
	public expression(i: number): ExpressionContext {
		return this.getTypedRuleContext(ExpressionContext, i) as ExpressionContext;
	}
	public COMMA_list(): TerminalNode[] {
	    	return this.getTokens(CSharpRoutineParser.COMMA);
	}
	public COMMA(i: number): TerminalNode {
		return this.getToken(CSharpRoutineParser.COMMA, i);
	}
    public get ruleIndex(): number {
    	return CSharpRoutineParser.RULE_expression_list;
	}
	public enterRule(listener: CSharpRoutineParserListener): void {
	    if(listener.enterExpression_list) {
	 		listener.enterExpression_list(this);
		}
	}
	public exitRule(listener: CSharpRoutineParserListener): void {
	    if(listener.exitExpression_list) {
	 		listener.exitExpression_list(this);
		}
	}
}


export class ExpressionContext extends ParserRuleContext {
	constructor(parser?: CSharpRoutineParser, parent?: ParserRuleContext, invokingState?: number) {
		super(parent, invokingState);
    	this.parser = parser;
	}
    public get ruleIndex(): number {
    	return CSharpRoutineParser.RULE_expression;
	}
	public copyFrom(ctx: ExpressionContext): void {
		super.copyFrom(ctx);
	}
}
export class Expression_bitwise_orContext extends ExpressionContext {
	constructor(parser: CSharpRoutineParser, ctx: ExpressionContext) {
		super(parser, ctx.parentCtx, ctx.invokingState);
		super.copyFrom(ctx);
	}
	public expression_list(): ExpressionContext[] {
		return this.getTypedRuleContexts(ExpressionContext) as ExpressionContext[];
	}
	public expression(i: number): ExpressionContext {
		return this.getTypedRuleContext(ExpressionContext, i) as ExpressionContext;
	}
	public BIT_OR(): TerminalNode {
		return this.getToken(CSharpRoutineParser.BIT_OR, 0);
	}
	public enterRule(listener: CSharpRoutineParserListener): void {
	    if(listener.enterExpression_bitwise_or) {
	 		listener.enterExpression_bitwise_or(this);
		}
	}
	public exitRule(listener: CSharpRoutineParserListener): void {
	    if(listener.exitExpression_bitwise_or) {
	 		listener.exitExpression_bitwise_or(this);
		}
	}
}
export class Expression_bitwise_andContext extends ExpressionContext {
	constructor(parser: CSharpRoutineParser, ctx: ExpressionContext) {
		super(parser, ctx.parentCtx, ctx.invokingState);
		super.copyFrom(ctx);
	}
	public expression_list(): ExpressionContext[] {
		return this.getTypedRuleContexts(ExpressionContext) as ExpressionContext[];
	}
	public expression(i: number): ExpressionContext {
		return this.getTypedRuleContext(ExpressionContext, i) as ExpressionContext;
	}
	public BIT_AND(): TerminalNode {
		return this.getToken(CSharpRoutineParser.BIT_AND, 0);
	}
	public enterRule(listener: CSharpRoutineParserListener): void {
	    if(listener.enterExpression_bitwise_and) {
	 		listener.enterExpression_bitwise_and(this);
		}
	}
	public exitRule(listener: CSharpRoutineParserListener): void {
	    if(listener.exitExpression_bitwise_and) {
	 		listener.exitExpression_bitwise_and(this);
		}
	}
}
export class Expression_relational_gtContext extends ExpressionContext {
	constructor(parser: CSharpRoutineParser, ctx: ExpressionContext) {
		super(parser, ctx.parentCtx, ctx.invokingState);
		super.copyFrom(ctx);
	}
	public expression_list(): ExpressionContext[] {
		return this.getTypedRuleContexts(ExpressionContext) as ExpressionContext[];
	}
	public expression(i: number): ExpressionContext {
		return this.getTypedRuleContext(ExpressionContext, i) as ExpressionContext;
	}
	public GT(): TerminalNode {
		return this.getToken(CSharpRoutineParser.GT, 0);
	}
	public enterRule(listener: CSharpRoutineParserListener): void {
	    if(listener.enterExpression_relational_gt) {
	 		listener.enterExpression_relational_gt(this);
		}
	}
	public exitRule(listener: CSharpRoutineParserListener): void {
	    if(listener.exitExpression_relational_gt) {
	 		listener.exitExpression_relational_gt(this);
		}
	}
}
export class Expression_postfix_invokeContext extends ExpressionContext {
	constructor(parser: CSharpRoutineParser, ctx: ExpressionContext) {
		super(parser, ctx.parentCtx, ctx.invokingState);
		super.copyFrom(ctx);
	}
	public expression(): ExpressionContext {
		return this.getTypedRuleContext(ExpressionContext, 0) as ExpressionContext;
	}
	public LPAREN(): TerminalNode {
		return this.getToken(CSharpRoutineParser.LPAREN, 0);
	}
	public RPAREN(): TerminalNode {
		return this.getToken(CSharpRoutineParser.RPAREN, 0);
	}
	public expression_list(): Expression_listContext {
		return this.getTypedRuleContext(Expression_listContext, 0) as Expression_listContext;
	}
	public enterRule(listener: CSharpRoutineParserListener): void {
	    if(listener.enterExpression_postfix_invoke) {
	 		listener.enterExpression_postfix_invoke(this);
		}
	}
	public exitRule(listener: CSharpRoutineParserListener): void {
	    if(listener.exitExpression_postfix_invoke) {
	 		listener.exitExpression_postfix_invoke(this);
		}
	}
}
export class Expression_bitwise_xorContext extends ExpressionContext {
	constructor(parser: CSharpRoutineParser, ctx: ExpressionContext) {
		super(parser, ctx.parentCtx, ctx.invokingState);
		super.copyFrom(ctx);
	}
	public expression_list(): ExpressionContext[] {
		return this.getTypedRuleContexts(ExpressionContext) as ExpressionContext[];
	}
	public expression(i: number): ExpressionContext {
		return this.getTypedRuleContext(ExpressionContext, i) as ExpressionContext;
	}
	public BIT_XOR(): TerminalNode {
		return this.getToken(CSharpRoutineParser.BIT_XOR, 0);
	}
	public enterRule(listener: CSharpRoutineParserListener): void {
	    if(listener.enterExpression_bitwise_xor) {
	 		listener.enterExpression_bitwise_xor(this);
		}
	}
	public exitRule(listener: CSharpRoutineParserListener): void {
	    if(listener.exitExpression_bitwise_xor) {
	 		listener.exitExpression_bitwise_xor(this);
		}
	}
}
export class Expression_postfix_inc_decContext extends ExpressionContext {
	constructor(parser: CSharpRoutineParser, ctx: ExpressionContext) {
		super(parser, ctx.parentCtx, ctx.invokingState);
		super.copyFrom(ctx);
	}
	public expression(): ExpressionContext {
		return this.getTypedRuleContext(ExpressionContext, 0) as ExpressionContext;
	}
	public INC(): TerminalNode {
		return this.getToken(CSharpRoutineParser.INC, 0);
	}
	public DEC(): TerminalNode {
		return this.getToken(CSharpRoutineParser.DEC, 0);
	}
	public enterRule(listener: CSharpRoutineParserListener): void {
	    if(listener.enterExpression_postfix_inc_dec) {
	 		listener.enterExpression_postfix_inc_dec(this);
		}
	}
	public exitRule(listener: CSharpRoutineParserListener): void {
	    if(listener.exitExpression_postfix_inc_dec) {
	 		listener.exitExpression_postfix_inc_dec(this);
		}
	}
}
export class Expression_primary_parentheticalContext extends ExpressionContext {
	constructor(parser: CSharpRoutineParser, ctx: ExpressionContext) {
		super(parser, ctx.parentCtx, ctx.invokingState);
		super.copyFrom(ctx);
	}
	public LPAREN(): TerminalNode {
		return this.getToken(CSharpRoutineParser.LPAREN, 0);
	}
	public expression(): ExpressionContext {
		return this.getTypedRuleContext(ExpressionContext, 0) as ExpressionContext;
	}
	public RPAREN(): TerminalNode {
		return this.getToken(CSharpRoutineParser.RPAREN, 0);
	}
	public enterRule(listener: CSharpRoutineParserListener): void {
	    if(listener.enterExpression_primary_parenthetical) {
	 		listener.enterExpression_primary_parenthetical(this);
		}
	}
	public exitRule(listener: CSharpRoutineParserListener): void {
	    if(listener.exitExpression_primary_parenthetical) {
	 		listener.exitExpression_primary_parenthetical(this);
		}
	}
}
export class Expression_additive_addContext extends ExpressionContext {
	constructor(parser: CSharpRoutineParser, ctx: ExpressionContext) {
		super(parser, ctx.parentCtx, ctx.invokingState);
		super.copyFrom(ctx);
	}
	public expression_list(): ExpressionContext[] {
		return this.getTypedRuleContexts(ExpressionContext) as ExpressionContext[];
	}
	public expression(i: number): ExpressionContext {
		return this.getTypedRuleContext(ExpressionContext, i) as ExpressionContext;
	}
	public ADD(): TerminalNode {
		return this.getToken(CSharpRoutineParser.ADD, 0);
	}
	public enterRule(listener: CSharpRoutineParserListener): void {
	    if(listener.enterExpression_additive_add) {
	 		listener.enterExpression_additive_add(this);
		}
	}
	public exitRule(listener: CSharpRoutineParserListener): void {
	    if(listener.exitExpression_additive_add) {
	 		listener.exitExpression_additive_add(this);
		}
	}
}
export class Expression_shift_rightContext extends ExpressionContext {
	constructor(parser: CSharpRoutineParser, ctx: ExpressionContext) {
		super(parser, ctx.parentCtx, ctx.invokingState);
		super.copyFrom(ctx);
	}
	public expression_list(): ExpressionContext[] {
		return this.getTypedRuleContexts(ExpressionContext) as ExpressionContext[];
	}
	public expression(i: number): ExpressionContext {
		return this.getTypedRuleContext(ExpressionContext, i) as ExpressionContext;
	}
	public GT_list(): TerminalNode[] {
	    	return this.getTokens(CSharpRoutineParser.GT);
	}
	public GT(i: number): TerminalNode {
		return this.getToken(CSharpRoutineParser.GT, i);
	}
	public enterRule(listener: CSharpRoutineParserListener): void {
	    if(listener.enterExpression_shift_right) {
	 		listener.enterExpression_shift_right(this);
		}
	}
	public exitRule(listener: CSharpRoutineParserListener): void {
	    if(listener.exitExpression_shift_right) {
	 		listener.exitExpression_shift_right(this);
		}
	}
}
export class Expression_ternaryContext extends ExpressionContext {
	constructor(parser: CSharpRoutineParser, ctx: ExpressionContext) {
		super(parser, ctx.parentCtx, ctx.invokingState);
		super.copyFrom(ctx);
	}
	public expression_list(): ExpressionContext[] {
		return this.getTypedRuleContexts(ExpressionContext) as ExpressionContext[];
	}
	public expression(i: number): ExpressionContext {
		return this.getTypedRuleContext(ExpressionContext, i) as ExpressionContext;
	}
	public TERNARY(): TerminalNode {
		return this.getToken(CSharpRoutineParser.TERNARY, 0);
	}
	public COLON(): TerminalNode {
		return this.getToken(CSharpRoutineParser.COLON, 0);
	}
	public enterRule(listener: CSharpRoutineParserListener): void {
	    if(listener.enterExpression_ternary) {
	 		listener.enterExpression_ternary(this);
		}
	}
	public exitRule(listener: CSharpRoutineParserListener): void {
	    if(listener.exitExpression_ternary) {
	 		listener.exitExpression_ternary(this);
		}
	}
}
export class Expression_equality_not_eqContext extends ExpressionContext {
	constructor(parser: CSharpRoutineParser, ctx: ExpressionContext) {
		super(parser, ctx.parentCtx, ctx.invokingState);
		super.copyFrom(ctx);
	}
	public expression_list(): ExpressionContext[] {
		return this.getTypedRuleContexts(ExpressionContext) as ExpressionContext[];
	}
	public expression(i: number): ExpressionContext {
		return this.getTypedRuleContext(ExpressionContext, i) as ExpressionContext;
	}
	public NOTEQUAL(): TerminalNode {
		return this.getToken(CSharpRoutineParser.NOTEQUAL, 0);
	}
	public enterRule(listener: CSharpRoutineParserListener): void {
	    if(listener.enterExpression_equality_not_eq) {
	 		listener.enterExpression_equality_not_eq(this);
		}
	}
	public exitRule(listener: CSharpRoutineParserListener): void {
	    if(listener.exitExpression_equality_not_eq) {
	 		listener.exitExpression_equality_not_eq(this);
		}
	}
}
export class Expression_logical_orContext extends ExpressionContext {
	constructor(parser: CSharpRoutineParser, ctx: ExpressionContext) {
		super(parser, ctx.parentCtx, ctx.invokingState);
		super.copyFrom(ctx);
	}
	public expression_list(): ExpressionContext[] {
		return this.getTypedRuleContexts(ExpressionContext) as ExpressionContext[];
	}
	public expression(i: number): ExpressionContext {
		return this.getTypedRuleContext(ExpressionContext, i) as ExpressionContext;
	}
	public OR(): TerminalNode {
		return this.getToken(CSharpRoutineParser.OR, 0);
	}
	public enterRule(listener: CSharpRoutineParserListener): void {
	    if(listener.enterExpression_logical_or) {
	 		listener.enterExpression_logical_or(this);
		}
	}
	public exitRule(listener: CSharpRoutineParserListener): void {
	    if(listener.exitExpression_logical_or) {
	 		listener.exitExpression_logical_or(this);
		}
	}
}
export class Expression_primary_literalContext extends ExpressionContext {
	constructor(parser: CSharpRoutineParser, ctx: ExpressionContext) {
		super(parser, ctx.parentCtx, ctx.invokingState);
		super.copyFrom(ctx);
	}
	public literal(): LiteralContext {
		return this.getTypedRuleContext(LiteralContext, 0) as LiteralContext;
	}
	public enterRule(listener: CSharpRoutineParserListener): void {
	    if(listener.enterExpression_primary_literal) {
	 		listener.enterExpression_primary_literal(this);
		}
	}
	public exitRule(listener: CSharpRoutineParserListener): void {
	    if(listener.exitExpression_primary_literal) {
	 		listener.exitExpression_primary_literal(this);
		}
	}
}
export class Expression_relational_geContext extends ExpressionContext {
	constructor(parser: CSharpRoutineParser, ctx: ExpressionContext) {
		super(parser, ctx.parentCtx, ctx.invokingState);
		super.copyFrom(ctx);
	}
	public expression_list(): ExpressionContext[] {
		return this.getTypedRuleContexts(ExpressionContext) as ExpressionContext[];
	}
	public expression(i: number): ExpressionContext {
		return this.getTypedRuleContext(ExpressionContext, i) as ExpressionContext;
	}
	public GE(): TerminalNode {
		return this.getToken(CSharpRoutineParser.GE, 0);
	}
	public enterRule(listener: CSharpRoutineParserListener): void {
	    if(listener.enterExpression_relational_ge) {
	 		listener.enterExpression_relational_ge(this);
		}
	}
	public exitRule(listener: CSharpRoutineParserListener): void {
	    if(listener.exitExpression_relational_ge) {
	 		listener.exitExpression_relational_ge(this);
		}
	}
}
export class Expression_shift_leftContext extends ExpressionContext {
	constructor(parser: CSharpRoutineParser, ctx: ExpressionContext) {
		super(parser, ctx.parentCtx, ctx.invokingState);
		super.copyFrom(ctx);
	}
	public expression_list(): ExpressionContext[] {
		return this.getTypedRuleContexts(ExpressionContext) as ExpressionContext[];
	}
	public expression(i: number): ExpressionContext {
		return this.getTypedRuleContext(ExpressionContext, i) as ExpressionContext;
	}
	public LT_list(): TerminalNode[] {
	    	return this.getTokens(CSharpRoutineParser.LT);
	}
	public LT(i: number): TerminalNode {
		return this.getToken(CSharpRoutineParser.LT, i);
	}
	public enterRule(listener: CSharpRoutineParserListener): void {
	    if(listener.enterExpression_shift_left) {
	 		listener.enterExpression_shift_left(this);
		}
	}
	public exitRule(listener: CSharpRoutineParserListener): void {
	    if(listener.exitExpression_shift_left) {
	 		listener.exitExpression_shift_left(this);
		}
	}
}
export class Expression_equality_eqContext extends ExpressionContext {
	constructor(parser: CSharpRoutineParser, ctx: ExpressionContext) {
		super(parser, ctx.parentCtx, ctx.invokingState);
		super.copyFrom(ctx);
	}
	public expression_list(): ExpressionContext[] {
		return this.getTypedRuleContexts(ExpressionContext) as ExpressionContext[];
	}
	public expression(i: number): ExpressionContext {
		return this.getTypedRuleContext(ExpressionContext, i) as ExpressionContext;
	}
	public EQUAL(): TerminalNode {
		return this.getToken(CSharpRoutineParser.EQUAL, 0);
	}
	public enterRule(listener: CSharpRoutineParserListener): void {
	    if(listener.enterExpression_equality_eq) {
	 		listener.enterExpression_equality_eq(this);
		}
	}
	public exitRule(listener: CSharpRoutineParserListener): void {
	    if(listener.exitExpression_equality_eq) {
	 		listener.exitExpression_equality_eq(this);
		}
	}
}
export class Expression_primary_nameContext extends ExpressionContext {
	constructor(parser: CSharpRoutineParser, ctx: ExpressionContext) {
		super(parser, ctx.parentCtx, ctx.invokingState);
		super.copyFrom(ctx);
	}
	public name(): NameContext {
		return this.getTypedRuleContext(NameContext, 0) as NameContext;
	}
	public enterRule(listener: CSharpRoutineParserListener): void {
	    if(listener.enterExpression_primary_name) {
	 		listener.enterExpression_primary_name(this);
		}
	}
	public exitRule(listener: CSharpRoutineParserListener): void {
	    if(listener.exitExpression_primary_name) {
	 		listener.exitExpression_primary_name(this);
		}
	}
}
export class Expression_assignmentContext extends ExpressionContext {
	constructor(parser: CSharpRoutineParser, ctx: ExpressionContext) {
		super(parser, ctx.parentCtx, ctx.invokingState);
		super.copyFrom(ctx);
	}
	public expression_list(): ExpressionContext[] {
		return this.getTypedRuleContexts(ExpressionContext) as ExpressionContext[];
	}
	public expression(i: number): ExpressionContext {
		return this.getTypedRuleContext(ExpressionContext, i) as ExpressionContext;
	}
	public assignment_operator(): Assignment_operatorContext {
		return this.getTypedRuleContext(Assignment_operatorContext, 0) as Assignment_operatorContext;
	}
	public enterRule(listener: CSharpRoutineParserListener): void {
	    if(listener.enterExpression_assignment) {
	 		listener.enterExpression_assignment(this);
		}
	}
	public exitRule(listener: CSharpRoutineParserListener): void {
	    if(listener.exitExpression_assignment) {
	 		listener.exitExpression_assignment(this);
		}
	}
}
export class Expression_relational_ltContext extends ExpressionContext {
	constructor(parser: CSharpRoutineParser, ctx: ExpressionContext) {
		super(parser, ctx.parentCtx, ctx.invokingState);
		super.copyFrom(ctx);
	}
	public expression_list(): ExpressionContext[] {
		return this.getTypedRuleContexts(ExpressionContext) as ExpressionContext[];
	}
	public expression(i: number): ExpressionContext {
		return this.getTypedRuleContext(ExpressionContext, i) as ExpressionContext;
	}
	public LT(): TerminalNode {
		return this.getToken(CSharpRoutineParser.LT, 0);
	}
	public enterRule(listener: CSharpRoutineParserListener): void {
	    if(listener.enterExpression_relational_lt) {
	 		listener.enterExpression_relational_lt(this);
		}
	}
	public exitRule(listener: CSharpRoutineParserListener): void {
	    if(listener.exitExpression_relational_lt) {
	 		listener.exitExpression_relational_lt(this);
		}
	}
}
export class Expression_unaryContext extends ExpressionContext {
	constructor(parser: CSharpRoutineParser, ctx: ExpressionContext) {
		super(parser, ctx.parentCtx, ctx.invokingState);
		super.copyFrom(ctx);
	}
	public expression(): ExpressionContext {
		return this.getTypedRuleContext(ExpressionContext, 0) as ExpressionContext;
	}
	public SUB(): TerminalNode {
		return this.getToken(CSharpRoutineParser.SUB, 0);
	}
	public ADD(): TerminalNode {
		return this.getToken(CSharpRoutineParser.ADD, 0);
	}
	public NOT(): TerminalNode {
		return this.getToken(CSharpRoutineParser.NOT, 0);
	}
	public BIT_NOT(): TerminalNode {
		return this.getToken(CSharpRoutineParser.BIT_NOT, 0);
	}
	public DEC(): TerminalNode {
		return this.getToken(CSharpRoutineParser.DEC, 0);
	}
	public INC(): TerminalNode {
		return this.getToken(CSharpRoutineParser.INC, 0);
	}
	public LPAREN(): TerminalNode {
		return this.getToken(CSharpRoutineParser.LPAREN, 0);
	}
	public type_(): TypeContext {
		return this.getTypedRuleContext(TypeContext, 0) as TypeContext;
	}
	public RPAREN(): TerminalNode {
		return this.getToken(CSharpRoutineParser.RPAREN, 0);
	}
	public enterRule(listener: CSharpRoutineParserListener): void {
	    if(listener.enterExpression_unary) {
	 		listener.enterExpression_unary(this);
		}
	}
	public exitRule(listener: CSharpRoutineParserListener): void {
	    if(listener.exitExpression_unary) {
	 		listener.exitExpression_unary(this);
		}
	}
}
export class Expression_additive_subContext extends ExpressionContext {
	constructor(parser: CSharpRoutineParser, ctx: ExpressionContext) {
		super(parser, ctx.parentCtx, ctx.invokingState);
		super.copyFrom(ctx);
	}
	public expression_list(): ExpressionContext[] {
		return this.getTypedRuleContexts(ExpressionContext) as ExpressionContext[];
	}
	public expression(i: number): ExpressionContext {
		return this.getTypedRuleContext(ExpressionContext, i) as ExpressionContext;
	}
	public SUB(): TerminalNode {
		return this.getToken(CSharpRoutineParser.SUB, 0);
	}
	public enterRule(listener: CSharpRoutineParserListener): void {
	    if(listener.enterExpression_additive_sub) {
	 		listener.enterExpression_additive_sub(this);
		}
	}
	public exitRule(listener: CSharpRoutineParserListener): void {
	    if(listener.exitExpression_additive_sub) {
	 		listener.exitExpression_additive_sub(this);
		}
	}
}
export class Expression_multiplicative_divContext extends ExpressionContext {
	constructor(parser: CSharpRoutineParser, ctx: ExpressionContext) {
		super(parser, ctx.parentCtx, ctx.invokingState);
		super.copyFrom(ctx);
	}
	public expression_list(): ExpressionContext[] {
		return this.getTypedRuleContexts(ExpressionContext) as ExpressionContext[];
	}
	public expression(i: number): ExpressionContext {
		return this.getTypedRuleContext(ExpressionContext, i) as ExpressionContext;
	}
	public DIV(): TerminalNode {
		return this.getToken(CSharpRoutineParser.DIV, 0);
	}
	public enterRule(listener: CSharpRoutineParserListener): void {
	    if(listener.enterExpression_multiplicative_div) {
	 		listener.enterExpression_multiplicative_div(this);
		}
	}
	public exitRule(listener: CSharpRoutineParserListener): void {
	    if(listener.exitExpression_multiplicative_div) {
	 		listener.exitExpression_multiplicative_div(this);
		}
	}
}
export class Expression_postfix_array_accessContext extends ExpressionContext {
	constructor(parser: CSharpRoutineParser, ctx: ExpressionContext) {
		super(parser, ctx.parentCtx, ctx.invokingState);
		super.copyFrom(ctx);
	}
	public expression_list(): ExpressionContext[] {
		return this.getTypedRuleContexts(ExpressionContext) as ExpressionContext[];
	}
	public expression(i: number): ExpressionContext {
		return this.getTypedRuleContext(ExpressionContext, i) as ExpressionContext;
	}
	public LBRACK(): TerminalNode {
		return this.getToken(CSharpRoutineParser.LBRACK, 0);
	}
	public RBRACK(): TerminalNode {
		return this.getToken(CSharpRoutineParser.RBRACK, 0);
	}
	public enterRule(listener: CSharpRoutineParserListener): void {
	    if(listener.enterExpression_postfix_array_access) {
	 		listener.enterExpression_postfix_array_access(this);
		}
	}
	public exitRule(listener: CSharpRoutineParserListener): void {
	    if(listener.exitExpression_postfix_array_access) {
	 		listener.exitExpression_postfix_array_access(this);
		}
	}
}
export class Expression_logical_andContext extends ExpressionContext {
	constructor(parser: CSharpRoutineParser, ctx: ExpressionContext) {
		super(parser, ctx.parentCtx, ctx.invokingState);
		super.copyFrom(ctx);
	}
	public expression_list(): ExpressionContext[] {
		return this.getTypedRuleContexts(ExpressionContext) as ExpressionContext[];
	}
	public expression(i: number): ExpressionContext {
		return this.getTypedRuleContext(ExpressionContext, i) as ExpressionContext;
	}
	public AND(): TerminalNode {
		return this.getToken(CSharpRoutineParser.AND, 0);
	}
	public enterRule(listener: CSharpRoutineParserListener): void {
	    if(listener.enterExpression_logical_and) {
	 		listener.enterExpression_logical_and(this);
		}
	}
	public exitRule(listener: CSharpRoutineParserListener): void {
	    if(listener.exitExpression_logical_and) {
	 		listener.exitExpression_logical_and(this);
		}
	}
}
export class Expression_multiplicative_mulContext extends ExpressionContext {
	constructor(parser: CSharpRoutineParser, ctx: ExpressionContext) {
		super(parser, ctx.parentCtx, ctx.invokingState);
		super.copyFrom(ctx);
	}
	public expression_list(): ExpressionContext[] {
		return this.getTypedRuleContexts(ExpressionContext) as ExpressionContext[];
	}
	public expression(i: number): ExpressionContext {
		return this.getTypedRuleContext(ExpressionContext, i) as ExpressionContext;
	}
	public MUL(): TerminalNode {
		return this.getToken(CSharpRoutineParser.MUL, 0);
	}
	public enterRule(listener: CSharpRoutineParserListener): void {
	    if(listener.enterExpression_multiplicative_mul) {
	 		listener.enterExpression_multiplicative_mul(this);
		}
	}
	public exitRule(listener: CSharpRoutineParserListener): void {
	    if(listener.exitExpression_multiplicative_mul) {
	 		listener.exitExpression_multiplicative_mul(this);
		}
	}
}
export class Expression_multiplicative_modContext extends ExpressionContext {
	constructor(parser: CSharpRoutineParser, ctx: ExpressionContext) {
		super(parser, ctx.parentCtx, ctx.invokingState);
		super.copyFrom(ctx);
	}
	public expression_list(): ExpressionContext[] {
		return this.getTypedRuleContexts(ExpressionContext) as ExpressionContext[];
	}
	public expression(i: number): ExpressionContext {
		return this.getTypedRuleContext(ExpressionContext, i) as ExpressionContext;
	}
	public MOD(): TerminalNode {
		return this.getToken(CSharpRoutineParser.MOD, 0);
	}
	public enterRule(listener: CSharpRoutineParserListener): void {
	    if(listener.enterExpression_multiplicative_mod) {
	 		listener.enterExpression_multiplicative_mod(this);
		}
	}
	public exitRule(listener: CSharpRoutineParserListener): void {
	    if(listener.exitExpression_multiplicative_mod) {
	 		listener.exitExpression_multiplicative_mod(this);
		}
	}
}
export class Expression_relational_leContext extends ExpressionContext {
	constructor(parser: CSharpRoutineParser, ctx: ExpressionContext) {
		super(parser, ctx.parentCtx, ctx.invokingState);
		super.copyFrom(ctx);
	}
	public expression_list(): ExpressionContext[] {
		return this.getTypedRuleContexts(ExpressionContext) as ExpressionContext[];
	}
	public expression(i: number): ExpressionContext {
		return this.getTypedRuleContext(ExpressionContext, i) as ExpressionContext;
	}
	public LE(): TerminalNode {
		return this.getToken(CSharpRoutineParser.LE, 0);
	}
	public enterRule(listener: CSharpRoutineParserListener): void {
	    if(listener.enterExpression_relational_le) {
	 		listener.enterExpression_relational_le(this);
		}
	}
	public exitRule(listener: CSharpRoutineParserListener): void {
	    if(listener.exitExpression_relational_le) {
	 		listener.exitExpression_relational_le(this);
		}
	}
}


export class Assignment_operatorContext extends ParserRuleContext {
	constructor(parser?: CSharpRoutineParser, parent?: ParserRuleContext, invokingState?: number) {
		super(parent, invokingState);
    	this.parser = parser;
	}
	public ASSIGN(): TerminalNode {
		return this.getToken(CSharpRoutineParser.ASSIGN, 0);
	}
	public ADD_ASSIGN(): TerminalNode {
		return this.getToken(CSharpRoutineParser.ADD_ASSIGN, 0);
	}
	public SUB_ASSIGN(): TerminalNode {
		return this.getToken(CSharpRoutineParser.SUB_ASSIGN, 0);
	}
	public MUL_ASSIGN(): TerminalNode {
		return this.getToken(CSharpRoutineParser.MUL_ASSIGN, 0);
	}
	public DIV_ASSIGN(): TerminalNode {
		return this.getToken(CSharpRoutineParser.DIV_ASSIGN, 0);
	}
	public AND_ASSIGN(): TerminalNode {
		return this.getToken(CSharpRoutineParser.AND_ASSIGN, 0);
	}
	public OR_ASSIGN(): TerminalNode {
		return this.getToken(CSharpRoutineParser.OR_ASSIGN, 0);
	}
	public XOR_ASSIGN(): TerminalNode {
		return this.getToken(CSharpRoutineParser.XOR_ASSIGN, 0);
	}
	public MOD_ASSIGN(): TerminalNode {
		return this.getToken(CSharpRoutineParser.MOD_ASSIGN, 0);
	}
	public LSHIFT_ASSIGN(): TerminalNode {
		return this.getToken(CSharpRoutineParser.LSHIFT_ASSIGN, 0);
	}
	public RSHIFT_ASSIGN(): TerminalNode {
		return this.getToken(CSharpRoutineParser.RSHIFT_ASSIGN, 0);
	}
    public get ruleIndex(): number {
    	return CSharpRoutineParser.RULE_assignment_operator;
	}
	public enterRule(listener: CSharpRoutineParserListener): void {
	    if(listener.enterAssignment_operator) {
	 		listener.enterAssignment_operator(this);
		}
	}
	public exitRule(listener: CSharpRoutineParserListener): void {
	    if(listener.exitAssignment_operator) {
	 		listener.exitAssignment_operator(this);
		}
	}
}


export class TypeContext extends ParserRuleContext {
	constructor(parser?: CSharpRoutineParser, parent?: ParserRuleContext, invokingState?: number) {
		super(parent, invokingState);
    	this.parser = parser;
	}
	public primitive_type(): Primitive_typeContext {
		return this.getTypedRuleContext(Primitive_typeContext, 0) as Primitive_typeContext;
	}
	public name(): NameContext {
		return this.getTypedRuleContext(NameContext, 0) as NameContext;
	}
	public LT(): TerminalNode {
		return this.getToken(CSharpRoutineParser.LT, 0);
	}
	public type__list(): TypeContext[] {
		return this.getTypedRuleContexts(TypeContext) as TypeContext[];
	}
	public type_(i: number): TypeContext {
		return this.getTypedRuleContext(TypeContext, i) as TypeContext;
	}
	public GT(): TerminalNode {
		return this.getToken(CSharpRoutineParser.GT, 0);
	}
	public COMMA_list(): TerminalNode[] {
	    	return this.getTokens(CSharpRoutineParser.COMMA);
	}
	public COMMA(i: number): TerminalNode {
		return this.getToken(CSharpRoutineParser.COMMA, i);
	}
	public LBRACK(): TerminalNode {
		return this.getToken(CSharpRoutineParser.LBRACK, 0);
	}
	public RBRACK(): TerminalNode {
		return this.getToken(CSharpRoutineParser.RBRACK, 0);
	}
    public get ruleIndex(): number {
    	return CSharpRoutineParser.RULE_type;
	}
	public enterRule(listener: CSharpRoutineParserListener): void {
	    if(listener.enterType) {
	 		listener.enterType(this);
		}
	}
	public exitRule(listener: CSharpRoutineParserListener): void {
	    if(listener.exitType) {
	 		listener.exitType(this);
		}
	}
}


export class Primitive_typeContext extends ParserRuleContext {
	constructor(parser?: CSharpRoutineParser, parent?: ParserRuleContext, invokingState?: number) {
		super(parent, invokingState);
    	this.parser = parser;
	}
	public TYPE_BOOLEAN(): TerminalNode {
		return this.getToken(CSharpRoutineParser.TYPE_BOOLEAN, 0);
	}
	public TYPE_CHAR(): TerminalNode {
		return this.getToken(CSharpRoutineParser.TYPE_CHAR, 0);
	}
	public TYPE_FLOAT_DEFAULT(): TerminalNode {
		return this.getToken(CSharpRoutineParser.TYPE_FLOAT_DEFAULT, 0);
	}
	public TYPE_FLOAT32(): TerminalNode {
		return this.getToken(CSharpRoutineParser.TYPE_FLOAT32, 0);
	}
	public TYPE_FLOAT64(): TerminalNode {
		return this.getToken(CSharpRoutineParser.TYPE_FLOAT64, 0);
	}
	public TYPE_INT_DEFAULT(): TerminalNode {
		return this.getToken(CSharpRoutineParser.TYPE_INT_DEFAULT, 0);
	}
	public TYPE_INT8(): TerminalNode {
		return this.getToken(CSharpRoutineParser.TYPE_INT8, 0);
	}
	public TYPE_INT16(): TerminalNode {
		return this.getToken(CSharpRoutineParser.TYPE_INT16, 0);
	}
	public TYPE_INT32(): TerminalNode {
		return this.getToken(CSharpRoutineParser.TYPE_INT32, 0);
	}
	public TYPE_INT64(): TerminalNode {
		return this.getToken(CSharpRoutineParser.TYPE_INT64, 0);
	}
	public TYPE_UINT_DEFAULT(): TerminalNode {
		return this.getToken(CSharpRoutineParser.TYPE_UINT_DEFAULT, 0);
	}
	public TYPE_UINT8(): TerminalNode {
		return this.getToken(CSharpRoutineParser.TYPE_UINT8, 0);
	}
	public TYPE_UINT16(): TerminalNode {
		return this.getToken(CSharpRoutineParser.TYPE_UINT16, 0);
	}
	public TYPE_UINT32(): TerminalNode {
		return this.getToken(CSharpRoutineParser.TYPE_UINT32, 0);
	}
	public TYPE_UINT64(): TerminalNode {
		return this.getToken(CSharpRoutineParser.TYPE_UINT64, 0);
	}
	public TYPE_STRING(): TerminalNode {
		return this.getToken(CSharpRoutineParser.TYPE_STRING, 0);
	}
    public get ruleIndex(): number {
    	return CSharpRoutineParser.RULE_primitive_type;
	}
	public enterRule(listener: CSharpRoutineParserListener): void {
	    if(listener.enterPrimitive_type) {
	 		listener.enterPrimitive_type(this);
		}
	}
	public exitRule(listener: CSharpRoutineParserListener): void {
	    if(listener.exitPrimitive_type) {
	 		listener.exitPrimitive_type(this);
		}
	}
}


export class NameContext extends ParserRuleContext {
	constructor(parser?: CSharpRoutineParser, parent?: ParserRuleContext, invokingState?: number) {
		super(parent, invokingState);
    	this.parser = parser;
	}
	public IDENTIFIER_list(): TerminalNode[] {
	    	return this.getTokens(CSharpRoutineParser.IDENTIFIER);
	}
	public IDENTIFIER(i: number): TerminalNode {
		return this.getToken(CSharpRoutineParser.IDENTIFIER, i);
	}
	public DOT_list(): TerminalNode[] {
	    	return this.getTokens(CSharpRoutineParser.DOT);
	}
	public DOT(i: number): TerminalNode {
		return this.getToken(CSharpRoutineParser.DOT, i);
	}
    public get ruleIndex(): number {
    	return CSharpRoutineParser.RULE_name;
	}
	public enterRule(listener: CSharpRoutineParserListener): void {
	    if(listener.enterName) {
	 		listener.enterName(this);
		}
	}
	public exitRule(listener: CSharpRoutineParserListener): void {
	    if(listener.exitName) {
	 		listener.exitName(this);
		}
	}
}


export class Flag_listContext extends ParserRuleContext {
	constructor(parser?: CSharpRoutineParser, parent?: ParserRuleContext, invokingState?: number) {
		super(parent, invokingState);
    	this.parser = parser;
	}
	public IDENTIFIER_list(): TerminalNode[] {
	    	return this.getTokens(CSharpRoutineParser.IDENTIFIER);
	}
	public IDENTIFIER(i: number): TerminalNode {
		return this.getToken(CSharpRoutineParser.IDENTIFIER, i);
	}
	public COMMA_list(): TerminalNode[] {
	    	return this.getTokens(CSharpRoutineParser.COMMA);
	}
	public COMMA(i: number): TerminalNode {
		return this.getToken(CSharpRoutineParser.COMMA, i);
	}
    public get ruleIndex(): number {
    	return CSharpRoutineParser.RULE_flag_list;
	}
	public enterRule(listener: CSharpRoutineParserListener): void {
	    if(listener.enterFlag_list) {
	 		listener.enterFlag_list(this);
		}
	}
	public exitRule(listener: CSharpRoutineParserListener): void {
	    if(listener.exitFlag_list) {
	 		listener.exitFlag_list(this);
		}
	}
}


export class LiteralContext extends ParserRuleContext {
	constructor(parser?: CSharpRoutineParser, parent?: ParserRuleContext, invokingState?: number) {
		super(parent, invokingState);
    	this.parser = parser;
	}
	public INTEGER_LITERAL(): TerminalNode {
		return this.getToken(CSharpRoutineParser.INTEGER_LITERAL, 0);
	}
	public FLOATING_POINT_LITERAL(): TerminalNode {
		return this.getToken(CSharpRoutineParser.FLOATING_POINT_LITERAL, 0);
	}
	public BOOLEAN_LITERAL(): TerminalNode {
		return this.getToken(CSharpRoutineParser.BOOLEAN_LITERAL, 0);
	}
	public CHARACTER_LITERAL(): TerminalNode {
		return this.getToken(CSharpRoutineParser.CHARACTER_LITERAL, 0);
	}
	public STRING_LITERAL(): TerminalNode {
		return this.getToken(CSharpRoutineParser.STRING_LITERAL, 0);
	}
	public NULL_LITERAL(): TerminalNode {
		return this.getToken(CSharpRoutineParser.NULL_LITERAL, 0);
	}
	public NODE(): TerminalNode {
		return this.getToken(CSharpRoutineParser.NODE, 0);
	}
	public SIGNAL(): TerminalNode {
		return this.getToken(CSharpRoutineParser.SIGNAL, 0);
	}
    public get ruleIndex(): number {
    	return CSharpRoutineParser.RULE_literal;
	}
	public enterRule(listener: CSharpRoutineParserListener): void {
	    if(listener.enterLiteral) {
	 		listener.enterLiteral(this);
		}
	}
	public exitRule(listener: CSharpRoutineParserListener): void {
	    if(listener.exitLiteral) {
	 		listener.exitLiteral(this);
		}
	}
}
