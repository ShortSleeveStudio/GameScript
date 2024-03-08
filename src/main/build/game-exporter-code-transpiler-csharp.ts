import { CharStream, CommonTokenStream, ParseTree, RuleNode } from 'antlr4';
import { Routine } from '../../common/common-schema';
import CSharpRoutineLexer from '../generated/csharp/CSharpRoutineLexer';
import CSharpRoutineParser, {
    ExpressionContext,
    RoutineContext,
} from '../generated/csharp/CSharpRoutineParser';
import { GameExporterCodeTranspiler } from './build-common';
import { TRANSPILER_CONTEXT_CLASS_NAME } from './game-exporter-code';
import { FlagCache } from './game-exporter-code-flagcache';

export class GameExporterCodeTranspilerCSharp implements GameExporterCodeTranspiler {
    private _routine: Routine | undefined;
    private _flagCache: FlagCache | undefined;
    private _accumulator: string;
    private _isExpression: boolean;

    constructor() {
        this._accumulator = '';
        this._isExpression = false;
    }

    transpile(routine: Routine, flagCache: FlagCache): string {
        try {
            this._routine = routine;
            this._flagCache = flagCache;
            const chars: CharStream = new CharStream(routine.code);
            const lexer: CSharpRoutineLexer = new CSharpRoutineLexer(chars);
            const tokens: CommonTokenStream = new CommonTokenStream(lexer);
            const parser: CSharpRoutineParser = new CSharpRoutineParser(tokens);
            parser.buildParseTrees = true;
            // parser.addErrorListener(this.parserErrorHandler);

            if (routine.isCondition) {
                const expression: ExpressionContext = parser.expression();
                this._isExpression = true;
                this.begin(expression);
            } else {
                const routine: RoutineContext = parser.routine();
                this.begin(routine);
            }
        } finally {
            this._flagCache = undefined;
            this._accumulator = '';
            this._isExpression = false;
        }
        return this._accumulator;
    }

    private begin(tree: ParseTree): void {
        this._accumulator += `public static void r${
            this._routine!.id
        }(${TRANSPILER_CONTEXT_CLASS_NAME} context)\n`;
        this._accumulator += '{\n';
        this.walk(tree);
        this._accumulator += '}\n';
    }

    private walk(tree: ParseTree): void {
        console.log(tree);
        // if (
        //     tree instanceof ErrorNode ||
        //     ('isErrorNode' in tree && (<() => boolean>tree['isErrorNode'])())
        // ) {
        //     throw new Error(tree.toString());
        // } else if (tree instanceof TerminalNode) {
        //     const terminalNode: TerminalNode = <TerminalNode>tree;
        //     console.log('TERMINAL NODE:');
        //     console.log(terminalNode.symbol.text);
        // } else {
        //     this.handleRuleNode(<RuleNode>tree);
        // }
        // switch (tree.ruleIndex()) {
        //     case CSharpRoutineParser.RULE_:
        //         ParseTreeWalker.DEFAULT.walk;
        //         break;
        // }
    }

    private handleRuleNode(rule: RuleNode): void {
        console.log(rule);

        // switch (rule)
        // {
        //     case  DialogueScriptParser.ScriptContext scriptContext:
        //         HandleScript(scriptContext);
        //         break;
        //     case DialogueScriptParser.Scheduled_block_openContext scheduledBlockOpenContext:
        //         HandleScheduledBlockOpen(scheduledBlockOpenContext);
        //         break;
        //     case DialogueScriptParser.Scheduled_block_closeContext scheduledBlockCloseContext:
        //         HandleScheduledBlockClose(scheduledBlockCloseContext);
        //         break;
        //     // case DialogueScriptParser.Expression_postfix_invokeContext invokeContext:
        //     //     HandleInvoke(invokeContext);
        //     //     break;
        //     case DialogueScriptParser.Expression_postfix_invoke_asyncContext invokeAsyncContext:
        //         HandleInvokeAsync(invokeAsyncContext);
        //         break;
        //     default:
        //         HandleNodeDefault(ruleNode);
        //         break;
        // }
    }
}
export const gameExporterCodeCSharp: GameExporterCodeTranspilerCSharp =
    new GameExporterCodeTranspilerCSharp();
