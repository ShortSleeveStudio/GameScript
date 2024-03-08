import { DbClient, DbConnection } from '../../common/common-db-types';
import { Routine } from '../../common/common-schema';
import {
    PROGRAMMING_LANGUAGE_CS,
    PROGRAMMING_LANGUAGE_TYPES,
    ROUTINE_TYPE_DEFAULT,
    ROUTINE_TYPE_IMPORT,
    ROUTINE_TYPE_USER_CREATED,
    TABLE_ROUTINES,
} from '../../common/common-types';
import { GameExportRequest } from '../../preload/api-build';
import { EXPORTER_BATCH_SIZE, GameCodeExporter, GameExporterCodeTranspiler } from './build-common';
import { FlagCache } from './game-exporter-code-flagcache';
import { gameExporterCodeCSharp } from './game-exporter-code-transpiler-csharp';

export const TRANSPILER_CONTEXT_CLASS_NAME: string = 'ConversationContext';

export class GameExporterCode implements GameCodeExporter {
    async export(db: DbClient, payload: GameExportRequest, conn: DbConnection): Promise<void> {
        // Setup transpilier context
        const transpiler: GameExporterCodeTranspiler | undefined =
            payload.language === PROGRAMMING_LANGUAGE_CS.id ? gameExporterCodeCSharp : undefined;
        if (transpiler === undefined) {
            throw new Error(
                `Programming language ${
                    PROGRAMMING_LANGUAGE_TYPES[payload.language].name
                } is not yet supported`,
            );
        }
        const flagCache: FlagCache = new FlagCache();

        const count: number = (<{ count: number }>(
            await db.get(conn, `SELECT COUNT(*) as count FROM ${TABLE_ROUTINES.name};`)
        )).count;
        for (let i = 0; i < count; i += EXPORTER_BATCH_SIZE) {
            const limit: number = EXPORTER_BATCH_SIZE;
            const offset: number = i;
            const queryFetchBatch: string = `
            SELECT * FROM ${TABLE_ROUTINES.name}
            ORDER BY id ASC LIMIT ${limit} OFFSET ${offset}`;
            const rows: Routine[] = await db.all<Routine[]>(conn, queryFetchBatch);
            for (let j = 0; j < rows.length; j++) {
                // Grab routine
                const routine: Routine = rows[j];

                // Ensure non-empty
                if (!routine.code || !routine.code.trim()) continue;

                // Transpile code
                switch (routine.type) {
                    case ROUTINE_TYPE_USER_CREATED.id:
                    case ROUTINE_TYPE_DEFAULT.id: {
                        const outputCode: string = transpiler.transpile(routine, flagCache);
                        console.log(outputCode);
                        break;
                    }
                    case ROUTINE_TYPE_IMPORT.id: {
                        console.log('IMPORTS:\n');
                        console.log(routine.code);
                        break;
                    }
                    default:
                        console.log(routine);
                        throw new Error(`Unknown routine type: ${routine.type}`);
                }
            }
        }
    }
    async teardown(): Promise<void> {}
}

export const gameExporterCodeAntlr = new GameExporterCode();
