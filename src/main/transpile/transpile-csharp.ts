import {
    CharStream,
    CommonTokenStream,
    ErrorListener,
    ParseTreeListener,
    ParseTreeWalker,
    Recognizer,
} from 'antlr4';
import { Routine } from '../../common/common-schema';
import { TranspileValidateRequest, TranspileValidateResponse } from '../../preload/api-transpile';
import CSharpRoutineLexer from '../generated/csharp/CSharpRoutineLexer';
import CSharpRoutineParser, {
    ExpressionContext,
    RoutineContext,
} from '../generated/csharp/CSharpRoutineParser';
import { Transpiler } from './transpile';

export class TranspilerCSharp implements Transpiler {
    validate(request: TranspileValidateRequest): TranspileValidateResponse {
        // Grab routine
        const routine: Routine = request.routine;

        // If there is no code, it is valid
        if (!request.routine.code || !request.routine.code.trim()) {
            return <TranspileValidateResponse>{
                isValid: true,
            };
        }

        // Transpile
        const chars: CharStream = new CharStream(routine.code);
        const lexer: CSharpRoutineLexer = new CSharpRoutineLexer(chars);
        const tokens: CommonTokenStream = new CommonTokenStream(lexer);
        const parser: CSharpRoutineParser = new CSharpRoutineParser(tokens);
        const listener: ParseTreeListener = new ParseTreeListenerNoop();
        const errorHandler: ErrorListenerDefault<unknown> = new ErrorListenerDefault();
        parser.buildParseTrees = true;
        lexer.removeErrorListeners();
        parser.removeErrorListeners();
        parser.addErrorListener(errorHandler);
        try {
            if (routine.is_condition) {
                const expression: ExpressionContext = parser.expression();
                ParseTreeWalker.DEFAULT.walk(listener, expression);
            } else {
                const routine: RoutineContext = parser.routine();
                ParseTreeWalker.DEFAULT.walk(listener, routine);
            }
        } catch {
            // ignore
        }

        return <TranspileValidateResponse>{
            isValid: !errorHandler.wasError,
            errorLine: errorHandler.errorLine,
            errorNumber: errorHandler.errorColumn,
            message: errorHandler.errorMessage,
        };
    }
}
export const transpilerCSharp: TranspilerCSharp = new TranspilerCSharp();

class ErrorListenerDefault<TSymbol> extends ErrorListener<TSymbol> {
    private _wasError: boolean;
    private _errorLine: number;
    private _errorColumn: number;
    private _errorMessage: string;

    constructor() {
        super();
        this._wasError = false;
        this._errorLine = 0;
        this._errorColumn = 0;
        this._errorMessage = '';
    }

    get wasError(): boolean {
        return this._wasError;
    }

    get errorLine(): number {
        return this._errorLine;
    }

    get errorColumn(): number {
        return this._errorColumn;
    }

    get errorMessage(): string {
        return this._errorMessage;
    }

    syntaxError(
        _recognizer: Recognizer<TSymbol>,
        _offendingSymbol: TSymbol,
        line: number,
        column: number,
        msg: string,
        // _e: RecognitionException | undefined,
    ): void {
        this._wasError = true;
        this._errorLine = line;
        this._errorColumn = column;
        this._errorMessage = msg;
        throw new Error();
    }
}

class ParseTreeListenerNoop extends ParseTreeListener {
    visitTerminal(): void {}
    visitErrorNode(): void {}
    enterEveryRule(): void {}
    exitEveryRule(): void {}
}
