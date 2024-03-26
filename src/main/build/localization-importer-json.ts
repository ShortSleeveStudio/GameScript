import { ReadStream } from 'fs';
import { Parser, parser } from 'stream-json';
import StreamArray, { streamArray } from 'stream-json/streamers/StreamArray';
import { pipeline } from 'stream/promises';
import { DbClient, DbConnection } from '../../common/common-db-types';
import { Localization } from '../../common/common-schema';
import { RowUpdateQueryBuilder } from '../../common/common-sql';
import { TABLE_LOCALIZATIONS } from '../../common/common-types';
import { LocalizationImporter } from './build-common';

export class LocalizationImporterJson implements LocalizationImporter {
    async setup(): Promise<void> {}
    async handleBatch(
        db: DbClient,
        fileStream: ReadStream,
        conn: DbConnection,
        queryBuilder: RowUpdateQueryBuilder,
    ): Promise<void> {
        const jsonParser: Parser = parser();
        const jsonArray: StreamArray = streamArray();
        pipeline(fileStream, jsonParser, jsonArray);
        for await (const chunk of jsonArray) {
            const localization: Localization = <Localization>chunk.value;
            const [query, argumentArray]: [string, unknown[]] = queryBuilder(
                TABLE_LOCALIZATIONS,
                localization,
            );
            await db.run(conn, query, argumentArray);
        }
    }
    async teardown(): Promise<void> {}
}

export const localizationImporterJson: LocalizationImporterJson = new LocalizationImporterJson();
