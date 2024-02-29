import { CastingContext, Options, Parser, parse } from 'csv-parse';
import { ReadStream } from 'fs';
import { pipeline } from 'stream/promises';
import { Localization } from '../../common/common-schema';
import { updateRowQuery } from '../../common/common-sql';
import { TABLE_LOCALIZATIONS } from '../../common/common-types';
import { DbClient, DbConnection } from '../../common/common-types-db';
import { LocalizationImportRequest } from '../../preload/api-build';
import {
    ColumnDescriptor,
    EXPORTER_CHARACTER_DELIMITER,
    EXPORTER_CHARACTER_ENCODING,
    LocalizationImporter,
} from './build-common';

export class LocalizationImporterCsv implements LocalizationImporter {
    private _columns: ColumnDescriptor[] | undefined;
    private _parseConfig: Options;
    private _headerNameToId: Map<string, string>;

    constructor() {
        this._columns = undefined;
        this._headerNameToId = new Map();
        this._parseConfig = <Options>{
            cast: this.rowCast,
            columns: this.headerCast,
            encoding: EXPORTER_CHARACTER_ENCODING,
            delimiter: EXPORTER_CHARACTER_DELIMITER,
        };
    }

    async setup(
        _importRequest: LocalizationImportRequest,
        columns: ColumnDescriptor[],
    ): Promise<void> {
        this._columns = columns;
        this._headerNameToId.clear();
        for (let i = 0; i < this._columns.length; i++) {
            this._headerNameToId.set(this._columns[i].name, this._columns[i].id);
        }
    }

    async handleBatch(db: DbClient, fileStream: ReadStream, conn: DbConnection): Promise<void> {
        const parser: Parser = parse(this._parseConfig);
        pipeline(fileStream, parser);
        for await (const chunk of parser) {
            const localization: Localization = <Localization>chunk;
            const [query, argumentArray]: [string, unknown[]] = updateRowQuery(
                TABLE_LOCALIZATIONS,
                localization,
            );
            await db.run(conn, query, argumentArray);
        }
    }

    async teardown(): Promise<void> {
        this._headerNameToId.clear();
        this._columns = undefined;
    }

    private rowCast: (value: string, context: CastingContext) => unknown = (
        value: string,
        context: CastingContext,
    ) => {
        // Header
        if (context.header) return value;

        // Row
        const columnName: string = this._columns![context.index].id;
        if (columnName === 'id') {
            const id: number = parseInt(value);
            if (isNaN(id)) throw new Error(`Row ID "${id}" in CSV was not a number.`);
            return id;
        }
        if (columnName === 'parent') {
            if (value === '') {
                return null;
            }
            return parseInt(value);
        }
        return value;
    };

    private headerCast: (headers: string[]) => string[] = (headers: string[]) => {
        const newHeaders: string[] = [];
        for (let i = 0; i < headers.length; i++) {
            const header: string = headers[i];
            const newHeader: string | undefined = this._headerNameToId.get(header);
            if (!newHeader) {
                throw new Error(`Encountered unexpected column name in CSV: ${header}`);
            }
            newHeaders.push(newHeader);
        }
        return newHeaders;
    };
}

export const localizationImporterCsv: LocalizationImporterCsv = new LocalizationImporterCsv();
