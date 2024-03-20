// Generated from ./CSharpRoutineParser.g4 by ANTLR 4.13.1

import {ParseTreeListener} from "antlr4";


import { RoutineContext } from "./CSharpRoutineParser";
import { Scheduled_blockContext } from "./CSharpRoutineParser";
import { Scheduled_block_openContext } from "./CSharpRoutineParser";
import { Scheduled_block_closeContext } from "./CSharpRoutineParser";
import { BlockContext } from "./CSharpRoutineParser";
import { StatementContext } from "./CSharpRoutineParser";
import { Compound_statementContext } from "./CSharpRoutineParser";
import { Statement_listContext } from "./CSharpRoutineParser";
import { Expression_statementContext } from "./CSharpRoutineParser";
import { If_statementContext } from "./CSharpRoutineParser";
import { Switch_statementContext } from "./CSharpRoutineParser";
import { Switch_blockContext } from "./CSharpRoutineParser";
import { Switch_labelContext } from "./CSharpRoutineParser";
import { Declaration_statementContext } from "./CSharpRoutineParser";
import { Declarator_initContext } from "./CSharpRoutineParser";
import { DeclaratorContext } from "./CSharpRoutineParser";
import { Break_statementContext } from "./CSharpRoutineParser";
import { Expression_listContext } from "./CSharpRoutineParser";
import { Expression_bitwise_orContext } from "./CSharpRoutineParser";
import { Expression_bitwise_andContext } from "./CSharpRoutineParser";
import { Expression_relational_gtContext } from "./CSharpRoutineParser";
import { Expression_postfix_invokeContext } from "./CSharpRoutineParser";
import { Expression_bitwise_xorContext } from "./CSharpRoutineParser";
import { Expression_postfix_inc_decContext } from "./CSharpRoutineParser";
import { Expression_primary_parentheticalContext } from "./CSharpRoutineParser";
import { Expression_additive_addContext } from "./CSharpRoutineParser";
import { Expression_shift_rightContext } from "./CSharpRoutineParser";
import { Expression_ternaryContext } from "./CSharpRoutineParser";
import { Expression_equality_not_eqContext } from "./CSharpRoutineParser";
import { Expression_logical_orContext } from "./CSharpRoutineParser";
import { Expression_primary_literalContext } from "./CSharpRoutineParser";
import { Expression_relational_geContext } from "./CSharpRoutineParser";
import { Expression_shift_leftContext } from "./CSharpRoutineParser";
import { Expression_equality_eqContext } from "./CSharpRoutineParser";
import { Expression_primary_nameContext } from "./CSharpRoutineParser";
import { Expression_assignmentContext } from "./CSharpRoutineParser";
import { Expression_relational_ltContext } from "./CSharpRoutineParser";
import { Expression_unaryContext } from "./CSharpRoutineParser";
import { Expression_additive_subContext } from "./CSharpRoutineParser";
import { Expression_multiplicative_divContext } from "./CSharpRoutineParser";
import { Expression_postfix_array_accessContext } from "./CSharpRoutineParser";
import { Expression_logical_andContext } from "./CSharpRoutineParser";
import { Expression_multiplicative_mulContext } from "./CSharpRoutineParser";
import { Expression_multiplicative_modContext } from "./CSharpRoutineParser";
import { Expression_relational_leContext } from "./CSharpRoutineParser";
import { Assignment_operatorContext } from "./CSharpRoutineParser";
import { TypeContext } from "./CSharpRoutineParser";
import { Primitive_typeContext } from "./CSharpRoutineParser";
import { NameContext } from "./CSharpRoutineParser";
import { Flag_listContext } from "./CSharpRoutineParser";
import { LiteralContext } from "./CSharpRoutineParser";


/**
 * This interface defines a complete listener for a parse tree produced by
 * `CSharpRoutineParser`.
 */
export default class CSharpRoutineParserListener extends ParseTreeListener {
	/**
	 * Enter a parse tree produced by `CSharpRoutineParser.routine`.
	 * @param ctx the parse tree
	 */
	enterRoutine?: (ctx: RoutineContext) => void;
	/**
	 * Exit a parse tree produced by `CSharpRoutineParser.routine`.
	 * @param ctx the parse tree
	 */
	exitRoutine?: (ctx: RoutineContext) => void;
	/**
	 * Enter a parse tree produced by `CSharpRoutineParser.scheduled_block`.
	 * @param ctx the parse tree
	 */
	enterScheduled_block?: (ctx: Scheduled_blockContext) => void;
	/**
	 * Exit a parse tree produced by `CSharpRoutineParser.scheduled_block`.
	 * @param ctx the parse tree
	 */
	exitScheduled_block?: (ctx: Scheduled_blockContext) => void;
	/**
	 * Enter a parse tree produced by `CSharpRoutineParser.scheduled_block_open`.
	 * @param ctx the parse tree
	 */
	enterScheduled_block_open?: (ctx: Scheduled_block_openContext) => void;
	/**
	 * Exit a parse tree produced by `CSharpRoutineParser.scheduled_block_open`.
	 * @param ctx the parse tree
	 */
	exitScheduled_block_open?: (ctx: Scheduled_block_openContext) => void;
	/**
	 * Enter a parse tree produced by `CSharpRoutineParser.scheduled_block_close`.
	 * @param ctx the parse tree
	 */
	enterScheduled_block_close?: (ctx: Scheduled_block_closeContext) => void;
	/**
	 * Exit a parse tree produced by `CSharpRoutineParser.scheduled_block_close`.
	 * @param ctx the parse tree
	 */
	exitScheduled_block_close?: (ctx: Scheduled_block_closeContext) => void;
	/**
	 * Enter a parse tree produced by `CSharpRoutineParser.block`.
	 * @param ctx the parse tree
	 */
	enterBlock?: (ctx: BlockContext) => void;
	/**
	 * Exit a parse tree produced by `CSharpRoutineParser.block`.
	 * @param ctx the parse tree
	 */
	exitBlock?: (ctx: BlockContext) => void;
	/**
	 * Enter a parse tree produced by `CSharpRoutineParser.statement`.
	 * @param ctx the parse tree
	 */
	enterStatement?: (ctx: StatementContext) => void;
	/**
	 * Exit a parse tree produced by `CSharpRoutineParser.statement`.
	 * @param ctx the parse tree
	 */
	exitStatement?: (ctx: StatementContext) => void;
	/**
	 * Enter a parse tree produced by `CSharpRoutineParser.compound_statement`.
	 * @param ctx the parse tree
	 */
	enterCompound_statement?: (ctx: Compound_statementContext) => void;
	/**
	 * Exit a parse tree produced by `CSharpRoutineParser.compound_statement`.
	 * @param ctx the parse tree
	 */
	exitCompound_statement?: (ctx: Compound_statementContext) => void;
	/**
	 * Enter a parse tree produced by `CSharpRoutineParser.statement_list`.
	 * @param ctx the parse tree
	 */
	enterStatement_list?: (ctx: Statement_listContext) => void;
	/**
	 * Exit a parse tree produced by `CSharpRoutineParser.statement_list`.
	 * @param ctx the parse tree
	 */
	exitStatement_list?: (ctx: Statement_listContext) => void;
	/**
	 * Enter a parse tree produced by `CSharpRoutineParser.expression_statement`.
	 * @param ctx the parse tree
	 */
	enterExpression_statement?: (ctx: Expression_statementContext) => void;
	/**
	 * Exit a parse tree produced by `CSharpRoutineParser.expression_statement`.
	 * @param ctx the parse tree
	 */
	exitExpression_statement?: (ctx: Expression_statementContext) => void;
	/**
	 * Enter a parse tree produced by `CSharpRoutineParser.if_statement`.
	 * @param ctx the parse tree
	 */
	enterIf_statement?: (ctx: If_statementContext) => void;
	/**
	 * Exit a parse tree produced by `CSharpRoutineParser.if_statement`.
	 * @param ctx the parse tree
	 */
	exitIf_statement?: (ctx: If_statementContext) => void;
	/**
	 * Enter a parse tree produced by `CSharpRoutineParser.switch_statement`.
	 * @param ctx the parse tree
	 */
	enterSwitch_statement?: (ctx: Switch_statementContext) => void;
	/**
	 * Exit a parse tree produced by `CSharpRoutineParser.switch_statement`.
	 * @param ctx the parse tree
	 */
	exitSwitch_statement?: (ctx: Switch_statementContext) => void;
	/**
	 * Enter a parse tree produced by `CSharpRoutineParser.switch_block`.
	 * @param ctx the parse tree
	 */
	enterSwitch_block?: (ctx: Switch_blockContext) => void;
	/**
	 * Exit a parse tree produced by `CSharpRoutineParser.switch_block`.
	 * @param ctx the parse tree
	 */
	exitSwitch_block?: (ctx: Switch_blockContext) => void;
	/**
	 * Enter a parse tree produced by `CSharpRoutineParser.switch_label`.
	 * @param ctx the parse tree
	 */
	enterSwitch_label?: (ctx: Switch_labelContext) => void;
	/**
	 * Exit a parse tree produced by `CSharpRoutineParser.switch_label`.
	 * @param ctx the parse tree
	 */
	exitSwitch_label?: (ctx: Switch_labelContext) => void;
	/**
	 * Enter a parse tree produced by `CSharpRoutineParser.declaration_statement`.
	 * @param ctx the parse tree
	 */
	enterDeclaration_statement?: (ctx: Declaration_statementContext) => void;
	/**
	 * Exit a parse tree produced by `CSharpRoutineParser.declaration_statement`.
	 * @param ctx the parse tree
	 */
	exitDeclaration_statement?: (ctx: Declaration_statementContext) => void;
	/**
	 * Enter a parse tree produced by `CSharpRoutineParser.declarator_init`.
	 * @param ctx the parse tree
	 */
	enterDeclarator_init?: (ctx: Declarator_initContext) => void;
	/**
	 * Exit a parse tree produced by `CSharpRoutineParser.declarator_init`.
	 * @param ctx the parse tree
	 */
	exitDeclarator_init?: (ctx: Declarator_initContext) => void;
	/**
	 * Enter a parse tree produced by `CSharpRoutineParser.declarator`.
	 * @param ctx the parse tree
	 */
	enterDeclarator?: (ctx: DeclaratorContext) => void;
	/**
	 * Exit a parse tree produced by `CSharpRoutineParser.declarator`.
	 * @param ctx the parse tree
	 */
	exitDeclarator?: (ctx: DeclaratorContext) => void;
	/**
	 * Enter a parse tree produced by `CSharpRoutineParser.break_statement`.
	 * @param ctx the parse tree
	 */
	enterBreak_statement?: (ctx: Break_statementContext) => void;
	/**
	 * Exit a parse tree produced by `CSharpRoutineParser.break_statement`.
	 * @param ctx the parse tree
	 */
	exitBreak_statement?: (ctx: Break_statementContext) => void;
	/**
	 * Enter a parse tree produced by `CSharpRoutineParser.expression_list`.
	 * @param ctx the parse tree
	 */
	enterExpression_list?: (ctx: Expression_listContext) => void;
	/**
	 * Exit a parse tree produced by `CSharpRoutineParser.expression_list`.
	 * @param ctx the parse tree
	 */
	exitExpression_list?: (ctx: Expression_listContext) => void;
	/**
	 * Enter a parse tree produced by the `expression_bitwise_or`
	 * labeled alternative in `CSharpRoutineParser.expression`.
	 * @param ctx the parse tree
	 */
	enterExpression_bitwise_or?: (ctx: Expression_bitwise_orContext) => void;
	/**
	 * Exit a parse tree produced by the `expression_bitwise_or`
	 * labeled alternative in `CSharpRoutineParser.expression`.
	 * @param ctx the parse tree
	 */
	exitExpression_bitwise_or?: (ctx: Expression_bitwise_orContext) => void;
	/**
	 * Enter a parse tree produced by the `expression_bitwise_and`
	 * labeled alternative in `CSharpRoutineParser.expression`.
	 * @param ctx the parse tree
	 */
	enterExpression_bitwise_and?: (ctx: Expression_bitwise_andContext) => void;
	/**
	 * Exit a parse tree produced by the `expression_bitwise_and`
	 * labeled alternative in `CSharpRoutineParser.expression`.
	 * @param ctx the parse tree
	 */
	exitExpression_bitwise_and?: (ctx: Expression_bitwise_andContext) => void;
	/**
	 * Enter a parse tree produced by the `expression_relational_gt`
	 * labeled alternative in `CSharpRoutineParser.expression`.
	 * @param ctx the parse tree
	 */
	enterExpression_relational_gt?: (ctx: Expression_relational_gtContext) => void;
	/**
	 * Exit a parse tree produced by the `expression_relational_gt`
	 * labeled alternative in `CSharpRoutineParser.expression`.
	 * @param ctx the parse tree
	 */
	exitExpression_relational_gt?: (ctx: Expression_relational_gtContext) => void;
	/**
	 * Enter a parse tree produced by the `expression_postfix_invoke`
	 * labeled alternative in `CSharpRoutineParser.expression`.
	 * @param ctx the parse tree
	 */
	enterExpression_postfix_invoke?: (ctx: Expression_postfix_invokeContext) => void;
	/**
	 * Exit a parse tree produced by the `expression_postfix_invoke`
	 * labeled alternative in `CSharpRoutineParser.expression`.
	 * @param ctx the parse tree
	 */
	exitExpression_postfix_invoke?: (ctx: Expression_postfix_invokeContext) => void;
	/**
	 * Enter a parse tree produced by the `expression_bitwise_xor`
	 * labeled alternative in `CSharpRoutineParser.expression`.
	 * @param ctx the parse tree
	 */
	enterExpression_bitwise_xor?: (ctx: Expression_bitwise_xorContext) => void;
	/**
	 * Exit a parse tree produced by the `expression_bitwise_xor`
	 * labeled alternative in `CSharpRoutineParser.expression`.
	 * @param ctx the parse tree
	 */
	exitExpression_bitwise_xor?: (ctx: Expression_bitwise_xorContext) => void;
	/**
	 * Enter a parse tree produced by the `expression_postfix_inc_dec`
	 * labeled alternative in `CSharpRoutineParser.expression`.
	 * @param ctx the parse tree
	 */
	enterExpression_postfix_inc_dec?: (ctx: Expression_postfix_inc_decContext) => void;
	/**
	 * Exit a parse tree produced by the `expression_postfix_inc_dec`
	 * labeled alternative in `CSharpRoutineParser.expression`.
	 * @param ctx the parse tree
	 */
	exitExpression_postfix_inc_dec?: (ctx: Expression_postfix_inc_decContext) => void;
	/**
	 * Enter a parse tree produced by the `expression_primary_parenthetical`
	 * labeled alternative in `CSharpRoutineParser.expression`.
	 * @param ctx the parse tree
	 */
	enterExpression_primary_parenthetical?: (ctx: Expression_primary_parentheticalContext) => void;
	/**
	 * Exit a parse tree produced by the `expression_primary_parenthetical`
	 * labeled alternative in `CSharpRoutineParser.expression`.
	 * @param ctx the parse tree
	 */
	exitExpression_primary_parenthetical?: (ctx: Expression_primary_parentheticalContext) => void;
	/**
	 * Enter a parse tree produced by the `expression_additive_add`
	 * labeled alternative in `CSharpRoutineParser.expression`.
	 * @param ctx the parse tree
	 */
	enterExpression_additive_add?: (ctx: Expression_additive_addContext) => void;
	/**
	 * Exit a parse tree produced by the `expression_additive_add`
	 * labeled alternative in `CSharpRoutineParser.expression`.
	 * @param ctx the parse tree
	 */
	exitExpression_additive_add?: (ctx: Expression_additive_addContext) => void;
	/**
	 * Enter a parse tree produced by the `expression_shift_right`
	 * labeled alternative in `CSharpRoutineParser.expression`.
	 * @param ctx the parse tree
	 */
	enterExpression_shift_right?: (ctx: Expression_shift_rightContext) => void;
	/**
	 * Exit a parse tree produced by the `expression_shift_right`
	 * labeled alternative in `CSharpRoutineParser.expression`.
	 * @param ctx the parse tree
	 */
	exitExpression_shift_right?: (ctx: Expression_shift_rightContext) => void;
	/**
	 * Enter a parse tree produced by the `expression_ternary`
	 * labeled alternative in `CSharpRoutineParser.expression`.
	 * @param ctx the parse tree
	 */
	enterExpression_ternary?: (ctx: Expression_ternaryContext) => void;
	/**
	 * Exit a parse tree produced by the `expression_ternary`
	 * labeled alternative in `CSharpRoutineParser.expression`.
	 * @param ctx the parse tree
	 */
	exitExpression_ternary?: (ctx: Expression_ternaryContext) => void;
	/**
	 * Enter a parse tree produced by the `expression_equality_not_eq`
	 * labeled alternative in `CSharpRoutineParser.expression`.
	 * @param ctx the parse tree
	 */
	enterExpression_equality_not_eq?: (ctx: Expression_equality_not_eqContext) => void;
	/**
	 * Exit a parse tree produced by the `expression_equality_not_eq`
	 * labeled alternative in `CSharpRoutineParser.expression`.
	 * @param ctx the parse tree
	 */
	exitExpression_equality_not_eq?: (ctx: Expression_equality_not_eqContext) => void;
	/**
	 * Enter a parse tree produced by the `expression_logical_or`
	 * labeled alternative in `CSharpRoutineParser.expression`.
	 * @param ctx the parse tree
	 */
	enterExpression_logical_or?: (ctx: Expression_logical_orContext) => void;
	/**
	 * Exit a parse tree produced by the `expression_logical_or`
	 * labeled alternative in `CSharpRoutineParser.expression`.
	 * @param ctx the parse tree
	 */
	exitExpression_logical_or?: (ctx: Expression_logical_orContext) => void;
	/**
	 * Enter a parse tree produced by the `expression_primary_literal`
	 * labeled alternative in `CSharpRoutineParser.expression`.
	 * @param ctx the parse tree
	 */
	enterExpression_primary_literal?: (ctx: Expression_primary_literalContext) => void;
	/**
	 * Exit a parse tree produced by the `expression_primary_literal`
	 * labeled alternative in `CSharpRoutineParser.expression`.
	 * @param ctx the parse tree
	 */
	exitExpression_primary_literal?: (ctx: Expression_primary_literalContext) => void;
	/**
	 * Enter a parse tree produced by the `expression_relational_ge`
	 * labeled alternative in `CSharpRoutineParser.expression`.
	 * @param ctx the parse tree
	 */
	enterExpression_relational_ge?: (ctx: Expression_relational_geContext) => void;
	/**
	 * Exit a parse tree produced by the `expression_relational_ge`
	 * labeled alternative in `CSharpRoutineParser.expression`.
	 * @param ctx the parse tree
	 */
	exitExpression_relational_ge?: (ctx: Expression_relational_geContext) => void;
	/**
	 * Enter a parse tree produced by the `expression_shift_left`
	 * labeled alternative in `CSharpRoutineParser.expression`.
	 * @param ctx the parse tree
	 */
	enterExpression_shift_left?: (ctx: Expression_shift_leftContext) => void;
	/**
	 * Exit a parse tree produced by the `expression_shift_left`
	 * labeled alternative in `CSharpRoutineParser.expression`.
	 * @param ctx the parse tree
	 */
	exitExpression_shift_left?: (ctx: Expression_shift_leftContext) => void;
	/**
	 * Enter a parse tree produced by the `expression_equality_eq`
	 * labeled alternative in `CSharpRoutineParser.expression`.
	 * @param ctx the parse tree
	 */
	enterExpression_equality_eq?: (ctx: Expression_equality_eqContext) => void;
	/**
	 * Exit a parse tree produced by the `expression_equality_eq`
	 * labeled alternative in `CSharpRoutineParser.expression`.
	 * @param ctx the parse tree
	 */
	exitExpression_equality_eq?: (ctx: Expression_equality_eqContext) => void;
	/**
	 * Enter a parse tree produced by the `expression_primary_name`
	 * labeled alternative in `CSharpRoutineParser.expression`.
	 * @param ctx the parse tree
	 */
	enterExpression_primary_name?: (ctx: Expression_primary_nameContext) => void;
	/**
	 * Exit a parse tree produced by the `expression_primary_name`
	 * labeled alternative in `CSharpRoutineParser.expression`.
	 * @param ctx the parse tree
	 */
	exitExpression_primary_name?: (ctx: Expression_primary_nameContext) => void;
	/**
	 * Enter a parse tree produced by the `expression_assignment`
	 * labeled alternative in `CSharpRoutineParser.expression`.
	 * @param ctx the parse tree
	 */
	enterExpression_assignment?: (ctx: Expression_assignmentContext) => void;
	/**
	 * Exit a parse tree produced by the `expression_assignment`
	 * labeled alternative in `CSharpRoutineParser.expression`.
	 * @param ctx the parse tree
	 */
	exitExpression_assignment?: (ctx: Expression_assignmentContext) => void;
	/**
	 * Enter a parse tree produced by the `expression_relational_lt`
	 * labeled alternative in `CSharpRoutineParser.expression`.
	 * @param ctx the parse tree
	 */
	enterExpression_relational_lt?: (ctx: Expression_relational_ltContext) => void;
	/**
	 * Exit a parse tree produced by the `expression_relational_lt`
	 * labeled alternative in `CSharpRoutineParser.expression`.
	 * @param ctx the parse tree
	 */
	exitExpression_relational_lt?: (ctx: Expression_relational_ltContext) => void;
	/**
	 * Enter a parse tree produced by the `expression_unary`
	 * labeled alternative in `CSharpRoutineParser.expression`.
	 * @param ctx the parse tree
	 */
	enterExpression_unary?: (ctx: Expression_unaryContext) => void;
	/**
	 * Exit a parse tree produced by the `expression_unary`
	 * labeled alternative in `CSharpRoutineParser.expression`.
	 * @param ctx the parse tree
	 */
	exitExpression_unary?: (ctx: Expression_unaryContext) => void;
	/**
	 * Enter a parse tree produced by the `expression_additive_sub`
	 * labeled alternative in `CSharpRoutineParser.expression`.
	 * @param ctx the parse tree
	 */
	enterExpression_additive_sub?: (ctx: Expression_additive_subContext) => void;
	/**
	 * Exit a parse tree produced by the `expression_additive_sub`
	 * labeled alternative in `CSharpRoutineParser.expression`.
	 * @param ctx the parse tree
	 */
	exitExpression_additive_sub?: (ctx: Expression_additive_subContext) => void;
	/**
	 * Enter a parse tree produced by the `expression_multiplicative_div`
	 * labeled alternative in `CSharpRoutineParser.expression`.
	 * @param ctx the parse tree
	 */
	enterExpression_multiplicative_div?: (ctx: Expression_multiplicative_divContext) => void;
	/**
	 * Exit a parse tree produced by the `expression_multiplicative_div`
	 * labeled alternative in `CSharpRoutineParser.expression`.
	 * @param ctx the parse tree
	 */
	exitExpression_multiplicative_div?: (ctx: Expression_multiplicative_divContext) => void;
	/**
	 * Enter a parse tree produced by the `expression_postfix_array_access`
	 * labeled alternative in `CSharpRoutineParser.expression`.
	 * @param ctx the parse tree
	 */
	enterExpression_postfix_array_access?: (ctx: Expression_postfix_array_accessContext) => void;
	/**
	 * Exit a parse tree produced by the `expression_postfix_array_access`
	 * labeled alternative in `CSharpRoutineParser.expression`.
	 * @param ctx the parse tree
	 */
	exitExpression_postfix_array_access?: (ctx: Expression_postfix_array_accessContext) => void;
	/**
	 * Enter a parse tree produced by the `expression_logical_and`
	 * labeled alternative in `CSharpRoutineParser.expression`.
	 * @param ctx the parse tree
	 */
	enterExpression_logical_and?: (ctx: Expression_logical_andContext) => void;
	/**
	 * Exit a parse tree produced by the `expression_logical_and`
	 * labeled alternative in `CSharpRoutineParser.expression`.
	 * @param ctx the parse tree
	 */
	exitExpression_logical_and?: (ctx: Expression_logical_andContext) => void;
	/**
	 * Enter a parse tree produced by the `expression_multiplicative_mul`
	 * labeled alternative in `CSharpRoutineParser.expression`.
	 * @param ctx the parse tree
	 */
	enterExpression_multiplicative_mul?: (ctx: Expression_multiplicative_mulContext) => void;
	/**
	 * Exit a parse tree produced by the `expression_multiplicative_mul`
	 * labeled alternative in `CSharpRoutineParser.expression`.
	 * @param ctx the parse tree
	 */
	exitExpression_multiplicative_mul?: (ctx: Expression_multiplicative_mulContext) => void;
	/**
	 * Enter a parse tree produced by the `expression_multiplicative_mod`
	 * labeled alternative in `CSharpRoutineParser.expression`.
	 * @param ctx the parse tree
	 */
	enterExpression_multiplicative_mod?: (ctx: Expression_multiplicative_modContext) => void;
	/**
	 * Exit a parse tree produced by the `expression_multiplicative_mod`
	 * labeled alternative in `CSharpRoutineParser.expression`.
	 * @param ctx the parse tree
	 */
	exitExpression_multiplicative_mod?: (ctx: Expression_multiplicative_modContext) => void;
	/**
	 * Enter a parse tree produced by the `expression_relational_le`
	 * labeled alternative in `CSharpRoutineParser.expression`.
	 * @param ctx the parse tree
	 */
	enterExpression_relational_le?: (ctx: Expression_relational_leContext) => void;
	/**
	 * Exit a parse tree produced by the `expression_relational_le`
	 * labeled alternative in `CSharpRoutineParser.expression`.
	 * @param ctx the parse tree
	 */
	exitExpression_relational_le?: (ctx: Expression_relational_leContext) => void;
	/**
	 * Enter a parse tree produced by `CSharpRoutineParser.assignment_operator`.
	 * @param ctx the parse tree
	 */
	enterAssignment_operator?: (ctx: Assignment_operatorContext) => void;
	/**
	 * Exit a parse tree produced by `CSharpRoutineParser.assignment_operator`.
	 * @param ctx the parse tree
	 */
	exitAssignment_operator?: (ctx: Assignment_operatorContext) => void;
	/**
	 * Enter a parse tree produced by `CSharpRoutineParser.type`.
	 * @param ctx the parse tree
	 */
	enterType?: (ctx: TypeContext) => void;
	/**
	 * Exit a parse tree produced by `CSharpRoutineParser.type`.
	 * @param ctx the parse tree
	 */
	exitType?: (ctx: TypeContext) => void;
	/**
	 * Enter a parse tree produced by `CSharpRoutineParser.primitive_type`.
	 * @param ctx the parse tree
	 */
	enterPrimitive_type?: (ctx: Primitive_typeContext) => void;
	/**
	 * Exit a parse tree produced by `CSharpRoutineParser.primitive_type`.
	 * @param ctx the parse tree
	 */
	exitPrimitive_type?: (ctx: Primitive_typeContext) => void;
	/**
	 * Enter a parse tree produced by `CSharpRoutineParser.name`.
	 * @param ctx the parse tree
	 */
	enterName?: (ctx: NameContext) => void;
	/**
	 * Exit a parse tree produced by `CSharpRoutineParser.name`.
	 * @param ctx the parse tree
	 */
	exitName?: (ctx: NameContext) => void;
	/**
	 * Enter a parse tree produced by `CSharpRoutineParser.flag_list`.
	 * @param ctx the parse tree
	 */
	enterFlag_list?: (ctx: Flag_listContext) => void;
	/**
	 * Exit a parse tree produced by `CSharpRoutineParser.flag_list`.
	 * @param ctx the parse tree
	 */
	exitFlag_list?: (ctx: Flag_listContext) => void;
	/**
	 * Enter a parse tree produced by `CSharpRoutineParser.literal`.
	 * @param ctx the parse tree
	 */
	enterLiteral?: (ctx: LiteralContext) => void;
	/**
	 * Exit a parse tree produced by `CSharpRoutineParser.literal`.
	 * @param ctx the parse tree
	 */
	exitLiteral?: (ctx: LiteralContext) => void;
}

