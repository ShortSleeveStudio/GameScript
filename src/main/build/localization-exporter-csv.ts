import { Options, stringify } from 'csv-stringify/sync';
import fs, { FileHandle } from 'fs/promises';
import path from 'path';
import { Localization } from '../../common/common-schema';
import { LOCALIZATION_DIVISION_PER_CONVERSATION } from '../../common/common-types';
import { LocalizationExportRequest } from '../../preload/api-build';
import {
    ColumnDescriptor,
    EXPORTER_CHARACTER_DELIMITER,
    EXPORTER_CHARACTER_ENCODING,
    EXPORTER_FILENAME_PREFIX_MISC,
    EXPORTER_FILENAME_PREFIX_PER_CONVERSATION,
    EXPORTER_FILENAME_PREFIX_SINGLE,
    LocalizationExporter,
} from './build-common';

export class LocalizationExporterCsv implements LocalizationExporter {
    private _fileHandle: FileHandle | undefined;
    private _exportRequest: LocalizationExportRequest | undefined;
    private _headers: string[] | undefined;
    private _headersContainer: string[][] | undefined;
    private _columns: ColumnDescriptor[] | undefined;
    private _writeList: unknown[];
    private _writeListContainer: unknown[][];
    private _currentConversationId: number;

    constructor() {
        this._fileHandle = undefined;
        this._exportRequest = undefined;
        this._headers = undefined;
        this._headersContainer = undefined;
        this._columns = undefined;
        this._writeList = [];
        this._writeListContainer = [this._writeList];
        this._currentConversationId = -1;
    }

    async setup(
        exportRequest: LocalizationExportRequest,
        columns: ColumnDescriptor[],
        headers: string[],
    ): Promise<void> {
        this._exportRequest = exportRequest;
        this._headers = headers;
        this._headersContainer = [this._headers];
        this._columns = columns;
    }

    async handleBatch(localizations: Localization[]): Promise<void> {
        for (let i = 0; i < localizations.length; i++) {
            // Grab localization
            const localization: Localization = localizations[i];

            // Ensure file descriptor
            if (this._exportRequest!.division === LOCALIZATION_DIVISION_PER_CONVERSATION.id) {
                if (this._currentConversationId !== localization.parent) {
                    // Close old descriptor
                    if (this._fileHandle) await this._fileHandle.close();

                    // Set new conversation id
                    this._currentConversationId = localization.parent;

                    // Open new descriptor
                    this._fileHandle = await fs.open(
                        path.join(
                            this._exportRequest!.location,
                            this._currentConversationId
                                ? EXPORTER_FILENAME_PREFIX_PER_CONVERSATION +
                                      this._currentConversationId +
                                      '.csv'
                                : `${EXPORTER_FILENAME_PREFIX_MISC}.csv`,
                        ),
                        'a',
                    );

                    // Write header
                    await this.writeLineToFile(this._headersContainer!);
                }
            } else {
                // Single file mode
                if (!this._fileHandle) {
                    // Open file for single file mode if needed
                    this._fileHandle = await fs.open(
                        path.join(
                            this._exportRequest!.location,
                            `${EXPORTER_FILENAME_PREFIX_SINGLE}.csv`,
                        ),
                        'a',
                    );

                    // Write header
                    await this.writeLineToFile(this._headersContainer!);
                }
            }

            // Write to file
            this._writeList.length = 0;
            for (let j = 0; j < this._columns!.length; j++) {
                this._writeList.push(localization[this._columns![j].id]);
            }
            await this.writeLineToFile(this._writeListContainer);
        }
    }

    async teardown(): Promise<void> {
        if (this._fileHandle) {
            await this._fileHandle.close();
            this._fileHandle = undefined;
        }
        this._exportRequest = undefined;
        this._headers = undefined;
        this._headersContainer = undefined;
        this._columns = undefined;
        this._writeList.length = 0;
        this._currentConversationId = -1;
    }

    private async writeLineToFile(list: unknown[]): Promise<void> {
        const csvLine = stringify(list, <Options>{
            encoding: EXPORTER_CHARACTER_ENCODING,
            delimiter: EXPORTER_CHARACTER_DELIMITER,
        });
        await this._fileHandle!.write(csvLine, undefined, 'utf-8');
    }
}

export const localizationExporterCsv = new LocalizationExporterCsv();
