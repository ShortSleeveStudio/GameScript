import { DbClient, DbConnection } from '../../common/common-db-types';
import { Node, Routine } from '../../common/common-schema';
import {
    ROUTINE_TYPE_DEFAULT,
    ROUTINE_TYPE_IMPORT,
    TABLE_NODES,
    TABLE_ROUTINES,
} from '../../common/common-types';
import { GameExportRequest } from '../../preload/api-build';
import { EXPORTER_BATCH_SIZE, GameCodeExporter } from './build-common';

export class GameExporterCodeAntlr implements GameCodeExporter {
    async setup(): Promise<void> {}
    async export(db: DbClient, payload: GameExportRequest, conn: DbConnection): Promise<void> {
        // Handle import routine
        await this.handleImports(db, conn);

        // Handle default routines
        await this.handleDefaultRoutines(db, conn);

        // Handle user routines
        await this.handleUserRoutines(db, conn);
    }
    async teardown(): Promise<void> {}

    async handleImports(db: DbClient, conn: DbConnection): Promise<void> {
        console.log('IMPORT ROUTINES:\n');
        const imports: string = (
            await db.get<Routine>(
                conn,
                `SELECT code FROM ${TABLE_ROUTINES.name} WHERE type = ${ROUTINE_TYPE_IMPORT.id}`,
            )
        ).code;
        console.log(imports);
        console.log('\n');
    }

    async handleDefaultRoutines(db: DbClient, conn: DbConnection): Promise<void> {
        console.log('DEFAULT ROUTINES:\n');
        const count: number = (<{ count: number }>await db.get(
            conn,
            `
            SELECT COUNT(*) as count FROM ${TABLE_ROUTINES.name}
            WHERE type = ${ROUTINE_TYPE_DEFAULT.id};`,
        )).count;
        for (let i = 0; i < count; i += EXPORTER_BATCH_SIZE) {
            const limit: number = EXPORTER_BATCH_SIZE;
            const offset: number = i;
            const queryFetchBatch: string = `
            SELECT id, code FROM ${TABLE_ROUTINES.name} 
            WHERE type = ${ROUTINE_TYPE_DEFAULT.id}
            ORDER BY id ASC LIMIT ${limit} OFFSET ${offset}`;
            const rows: Routine[] = await db.all<Routine[]>(conn, queryFetchBatch);
            for (let j = 0; j < rows.length; j++) {
                const routine: Routine = rows[j];
                const code: string | undefined = routine.code ? routine.code.trim() : undefined;
                if (code) console.log(code);
            }
        }
        console.log('\n');
    }

    async handleUserRoutines(db: DbClient, conn: DbConnection): Promise<void> {
        console.log('USER ROUTINES:\n');
        const count: number = (<{ count: number }>(
            await db.get(conn, `SELECT COUNT(*) as count FROM ${TABLE_NODES.name};`)
        )).count;
        for (let i = 0; i < count; i += EXPORTER_BATCH_SIZE) {
            const limit: number = EXPORTER_BATCH_SIZE;
            const offset: number = i;
            const queryFetchBatch: string = `
            SELECT id, code, condition FROM ${TABLE_NODES.name}
            ORDER BY id ASC LIMIT ${limit} OFFSET ${offset}`;
            const rows: Node[] = await db.all<Node[]>(conn, queryFetchBatch);
            for (let j = 0; j < rows.length; j++) {
                const node: Node = rows[j];

                // Handle Condition
                let condition: string = (
                    await db.get<Routine>(
                        conn,
                        `SELECT code FROM ${TABLE_ROUTINES.name} WHERE id = ${node.condition};`,
                    )
                ).code;
                if (condition) condition = condition.trim();
                if (condition) {
                    // TODO - HANDLE CONDITION
                    console.log(condition);
                }

                // Handle Code
                if (node.codeOverride === null) continue;
                let code: string = (
                    await db.get<Routine>(
                        conn,
                        `SELECT code FROM ${TABLE_ROUTINES.name} WHERE id = ${node.code};`,
                    )
                ).code;
                if (code) code = code.trim();
                if (code) {
                    // TODO - HANDLE CODE
                    console.log(code);
                }
            }
        }
    }
}

export const gameExporterCodeAntlr = new GameExporterCodeAntlr();
