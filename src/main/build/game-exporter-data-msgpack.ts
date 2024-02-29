import { DbClient, DbConnection } from '../../common/common-db-types';
import { GameExportRequest } from '../../preload/api-build';
import { GameExporter } from './build-common';

export class GameExporterDataMsgPack implements GameExporter {
    async setup(): Promise<void> {}
    async export(db: DbClient, payload: GameExportRequest, conn: DbConnection): Promise<void> {}
    async teardown(): Promise<void> {}
}

export const gameExporterDataMsgPack = new GameExporterDataMsgPack();
