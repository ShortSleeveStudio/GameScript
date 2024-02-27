import fs, { FileHandle } from 'fs/promises';
import Papa, { UnparseConfig } from 'papaparse';
import path from 'path';
import { Localization } from '../../common/common-schema';
import {
    LOCALIZATION_DIVISION_PER_CONVERSATION,
    LOCALIZATION_HEADER_INCLUDE_TRUE,
} from '../../common/common-types';
import { LocalizationExportRequest } from '../../preload/api-build';
import {
    ColumnDescriptor,
    EXPORTER_FILENAME_PREFIX_MISC,
    EXPORTER_FILENAME_PREFIX_PER_CONVERSATION,
    EXPORTER_FILENAME_PREFIX_SINGLE,
    Exporter,
} from './exporter';

export class ExporterCsv implements Exporter {
    private _fileHandle: FileHandle | undefined;
    private _exportRequest: LocalizationExportRequest | undefined;
    private _isFirstLineOfFile: boolean;
    private _headers: string[] | undefined;
    private _headersContainer: string[][] | undefined;
    private _columns: ColumnDescriptor[] | undefined;
    private _writeList: unknown[];
    private _writeListContainer: unknown[][];
    private _currentConversationId: number;

    constructor() {
        this._fileHandle = undefined;
        this._exportRequest = undefined;
        this._isFirstLineOfFile = false;
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
                                ? `${EXPORTER_FILENAME_PREFIX_PER_CONVERSATION}${this._currentConversationId}.csv`
                                : `${EXPORTER_FILENAME_PREFIX_MISC}.csv`,
                        ),
                        'a',
                    );
                    this._isFirstLineOfFile = true;

                    // Write header
                    if (
                        this._exportRequest!.csvHeaderInclude ===
                        LOCALIZATION_HEADER_INCLUDE_TRUE.id
                    ) {
                        await this.writeLineToFile(this._headersContainer!);
                    }
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
                    this._isFirstLineOfFile = true;

                    // Write header
                    if (
                        this._exportRequest!.csvHeaderInclude ===
                        LOCALIZATION_HEADER_INCLUDE_TRUE.id
                    ) {
                        await this.writeLineToFile(this._headersContainer!);
                    }
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
        this._isFirstLineOfFile = false;
        this._headers = undefined;
        this._headersContainer = undefined;
        this._columns = undefined;
        this._writeList.length = 0;
        this._currentConversationId = -1;
    }

    private async writeLineToFile(list: unknown[]): Promise<void> {
        let csvLine: string = Papa.unparse(list, <UnparseConfig>{
            header: false,
            quotes: true,
        });
        if (!this._isFirstLineOfFile) csvLine = '\n' + csvLine;
        await this._fileHandle!.write(csvLine, undefined, 'utf-8');
        this._isFirstLineOfFile = false;
    }
}

export const exporterCsv = new ExporterCsv();
