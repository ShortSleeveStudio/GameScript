import {
    FIELD_TYPE_INTEGER,
    FIELD_TYPE_LONG,
    FIELD_TYPE_TEXT,
    TABLE_NOTIFICATIONS,
} from '../common-types';
import { ColumnDefinition, TableDefinition } from './table-definitions';

export const TABLE_DEFINITION_NOTIFICATIONS: TableDefinition = new TableDefinition(
    TABLE_NOTIFICATIONS,
);
TABLE_DEFINITION_NOTIFICATIONS.addColumn(<ColumnDefinition>{
    name: 'id',
    type: FIELD_TYPE_INTEGER,
    notNull: false,
    defaultValue: undefined,
});
TABLE_DEFINITION_NOTIFICATIONS.addColumn(<ColumnDefinition>{
    name: 'timestamp',
    type: FIELD_TYPE_LONG,
    notNull: false,
    defaultValue: undefined,
});
TABLE_DEFINITION_NOTIFICATIONS.addColumn(<ColumnDefinition>{
    name: 'table_id',
    type: FIELD_TYPE_INTEGER,
    notNull: false,
    defaultValue: undefined,
});
TABLE_DEFINITION_NOTIFICATIONS.addColumn(<ColumnDefinition>{
    name: 'operation_id',
    type: FIELD_TYPE_INTEGER,
    notNull: false,
    defaultValue: undefined,
});
TABLE_DEFINITION_NOTIFICATIONS.addColumn(<ColumnDefinition>{
    name: 'json_payload',
    type: FIELD_TYPE_TEXT,
    notNull: false,
    defaultValue: undefined,
});
TABLE_DEFINITION_NOTIFICATIONS.setPrimaryKey('id');
