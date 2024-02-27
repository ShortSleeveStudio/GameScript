import { Localization } from '../../common/common-schema';
import { LocalizationExportRequest } from '../../preload/api-build';

export const EXPORTER_FILENAME_PREFIX_MISC: string = 'miscellaneous';
export const EXPORTER_FILENAME_PREFIX_SINGLE: string = 'localizations';
export const EXPORTER_FILENAME_PREFIX_PER_CONVERSATION: string = 'conversation_';

export interface ColumnDescriptor {
    id: string;
    name: string;
}

export interface Exporter {
    setup(
        exportRequest: LocalizationExportRequest,
        columns: ColumnDescriptor[],
        headers: string[],
    ): Promise<void>;
    handleBatch(localizations: Localization[]): Promise<void>;
    teardown(): Promise<void>;
}
