import { Row } from './common-schema';

export interface AppNotification {
    tableId: number;
    operationId: number;
    rows: Row[];
}
