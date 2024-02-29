import fs, { FileHandle } from 'fs/promises';
import path from 'path';
import { Localization } from '../../common/common-schema';
import { LOCALIZATION_DIVISION_PER_CONVERSATION } from '../../common/common-types';
import { LocalizationExportRequest } from '../../preload/api-build';
import {
    ColumnDescriptor,
    EXPORTER_FILENAME_PREFIX_MISC,
    EXPORTER_FILENAME_PREFIX_PER_CONVERSATION,
    EXPORTER_FILENAME_PREFIX_SINGLE,
    LocalizationExporter,
} from './build-common';

export class LocalizationExporterJson implements LocalizationExporter {
    private _fileHandle: FileHandle | undefined;
    private _exportRequest: LocalizationExportRequest | undefined;
    private _headers: string[] | undefined;
    private _columns: ColumnDescriptor[] | undefined;
    private _currentConversationId: number;
    private _isFirstLine: boolean;

    constructor() {
        this._fileHandle = undefined;
        this._exportRequest = undefined;
        this._headers = undefined;
        this._columns = undefined;
        this._currentConversationId = -1;
        this._isFirstLine = false;
    }

    async setup(
        exportRequest: LocalizationExportRequest,
        columns: ColumnDescriptor[],
        headers: string[],
    ): Promise<void> {
        this._exportRequest = exportRequest;
        this._headers = headers;
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
                    if (this._fileHandle) {
                        await this.listEnd();
                        await this._fileHandle.close();
                    }

                    // Set new conversation id
                    this._currentConversationId = localization.parent;

                    // Open new descriptor
                    this._fileHandle = await fs.open(
                        path.join(
                            this._exportRequest!.location,
                            this._currentConversationId
                                ? `${EXPORTER_FILENAME_PREFIX_PER_CONVERSATION}${this._currentConversationId}.json`
                                : `${EXPORTER_FILENAME_PREFIX_MISC}.json`,
                        ),
                        'a',
                    );
                    await this.listStart();
                    this._isFirstLine = true;
                }
            } else {
                // Single file mode
                if (!this._fileHandle) {
                    // Open file for single file mode if needed
                    this._fileHandle = await fs.open(
                        path.join(
                            this._exportRequest!.location,
                            `${EXPORTER_FILENAME_PREFIX_SINGLE}.json`,
                        ),
                        'a',
                    );
                    await this.listStart();
                    this._isFirstLine = true;
                }
            }

            // Write to file
            await this.writeLineToFile(localization);
        }
    }

    async teardown(): Promise<void> {
        await this.listEnd();
        if (this._fileHandle) {
            await this._fileHandle.close();
            this._fileHandle = undefined;
        }
        this._exportRequest = undefined;
        this._headers = undefined;
        this._columns = undefined;
        this._currentConversationId = -1;
        this._isFirstLine = false;
    }

    private async listStart(): Promise<void> {
        await this._fileHandle!.write('[');
    }

    private async listEnd(): Promise<void> {
        await this._fileHandle!.write(']');
    }

    private async writeLineToFile(localization: Localization): Promise<void> {
        // Add newline if necessary
        let line: string = '';
        if (!this._isFirstLine) line += ',';
        this._isFirstLine = false;
        line += JSON.stringify(localization);

        // Write line
        await this._fileHandle!.write(line, undefined, 'utf-8');
    }
}

export const localizationExporterJson = new LocalizationExporterJson();
