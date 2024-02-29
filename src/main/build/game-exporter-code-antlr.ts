import { DbClient, DbConnection } from '../../common/common-types-db';
import { GameExportRequest } from '../../preload/api-build';
import { GameCodeExporter } from './build-common';

export class GameExporterCodeAntlr implements GameCodeExporter {
    async setup(): Promise<void> {}
    async export(db: DbClient, payload: GameExportRequest, conn: DbConnection): Promise<void> {}
    async teardown(): Promise<void> {}
}

export const gameExporterCodeAntlr = new GameExporterCodeAntlr();
