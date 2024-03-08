parser grammar CSharpRoutineParser;

options {
    tokenVocab = CSharpRoutineLexer;
}

// Entry Point
routine: scheduled_block* EOF | block EOF;

// Scheduled Blocks
scheduled_block
    : scheduled_block_open block scheduled_block_close
;
scheduled_block_open: LT flag_list? SUB;
scheduled_block_close: SUB flag_list? GT;
block: statement*;

// Statements 
statement
    : if_statement
    | switch_statement
    | compound_statement
    | expression_statement
    | declaration_statement
    | break_statement
;

// Compound Statement
compound_statement: LBRACE statement_list? RBRACE;
statement_list: statement+;

// Expression Statement
expression_statement: expression SEMI;

// If Statement
if_statement
    : IF LPAREN expression RPAREN statement (ELSE statement)?
;

// Switch Statement
switch_statement: SWITCH LPAREN expression RPAREN switch_block;
switch_block: LBRACE switch_label* RBRACE;
switch_label
    : CASE expression COLON statement*
    | DEFAULT COLON statement*
;

// Declaration Statement
declaration_statement: type declarator_init SEMI;
declarator_init: declarator (ASSIGN expression)?;
declarator: IDENTIFIER;

// Break Statement
break_statement: BREAK SEMI;

// Expression
expression_list: expression (COMMA expression)*;
// Primary
expression
    : name                                      # expression_primary_name
    | literal                                   # expression_primary_literal
    | LPAREN expression RPAREN                  # expression_primary_parenthetical
    | expression (INC | DEC)                    # expression_postfix_inc_dec
    | expression LBRACK expression RBRACK       # expression_postfix_array_access
    | expression LPAREN expression_list? RPAREN # expression_postfix_invoke
    // Unary 
    | <assoc = right> (
        SUB
        | ADD
        | NOT
        | BIT_NOT
        | DEC
        | INC
        | LPAREN type RPAREN
    ) expression # expression_unary
    // Multiplicative
    | expression MUL expression # expression_multiplicative_mul
    | expression DIV expression # expression_multiplicative_div
    | expression MOD expression # expression_multiplicative_mod
    // Additive	
    | expression ADD expression     # expression_additive_add
    | expression SUB expression     # expression_additive_sub
    | expression '<' '<' expression # expression_shift_left
    | expression '>' '>' expression # expression_shift_right
    // Relational 
    | expression LT expression # expression_relational_lt
    | expression GT expression # expression_relational_gt
    | expression LE expression # expression_relational_le
    | expression GE expression # expression_relational_ge
    // Equality
    | expression EQUAL expression    # expression_equality_eq
    | expression NOTEQUAL expression # expression_equality_not_eq
    // Bitwise And
    | expression BIT_AND expression # expression_bitwise_and
    // Bitwise Or
    | expression BIT_OR expression # expression_bitwise_or
    // Bitwise Xor 
    | expression BIT_XOR expression # expression_bitwise_xor
    // Logical And
    | expression AND expression # expression_logical_and
    // Logical Or
    | expression OR expression # expression_logical_or
    // Ternary 
    | <assoc = right> expression TERNARY expression COLON expression # expression_ternary
    // Assignment
    | expression assignment_operator expression # expression_assignment
;

// Operators
assignment_operator
    : ASSIGN
    | ADD_ASSIGN
    | SUB_ASSIGN
    | MUL_ASSIGN
    | DIV_ASSIGN
    | AND_ASSIGN
    | OR_ASSIGN
    | XOR_ASSIGN
    | MOD_ASSIGN
    | LSHIFT_ASSIGN
    | RSHIFT_ASSIGN
;

// Types
type
    : primitive_type
    | type LBRACK RBRACK
    | name ('<' type (COMMA type)* '>')?
;

primitive_type
    : TYPE_BOOLEAN
    | TYPE_CHAR
    | TYPE_FLOAT_DEFAULT
    | TYPE_FLOAT32
    | TYPE_FLOAT64
    | TYPE_INT_DEFAULT
    | TYPE_INT8
    | TYPE_INT16
    | TYPE_INT32
    | TYPE_INT64
    | TYPE_UINT_DEFAULT
    | TYPE_UINT8
    | TYPE_UINT16
    | TYPE_UINT32
    | TYPE_UINT64
    | TYPE_STRING
;

// Name
name: IDENTIFIER (DOT IDENTIFIER)*;

// Flags 
flag_list: IDENTIFIER (COMMA IDENTIFIER)*;

// Literals
literal
    : INTEGER_LITERAL
    | FLOATING_POINT_LITERAL
    | BOOLEAN_LITERAL
    | CHARACTER_LITERAL
    | STRING_LITERAL
    | NULL_LITERAL
    | NODE
    | SIGNAL
;