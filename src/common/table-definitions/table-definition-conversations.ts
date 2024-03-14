import {
    FIELD_TYPE_BOOLEAN,
    FIELD_TYPE_INTEGER,
    FIELD_TYPE_TEXT,
    TABLE_CONVERSATIONS,
} from '../common-types';
import { TableDefinition, type ColumnDefinition } from './table-definitions';

export const TABLE_DEFINITION_CONVERSATIONS: TableDefinition = new TableDefinition(
    TABLE_CONVERSATIONS,
);
TABLE_DEFINITION_CONVERSATIONS.addColumn(<ColumnDefinition>{
    name: 'id',
    type: FIELD_TYPE_INTEGER,
    notNull: false,
    defaultValue: undefined,
});
TABLE_DEFINITION_CONVERSATIONS.addColumn(<ColumnDefinition>{
    name: 'name',
    type: FIELD_TYPE_TEXT,
    notNull: true,
    defaultValue: undefined,
});
TABLE_DEFINITION_CONVERSATIONS.addColumn(<ColumnDefinition>{
    name: 'isSystemCreated',
    type: FIELD_TYPE_BOOLEAN,
    notNull: true,
    defaultValue: undefined,
});
TABLE_DEFINITION_CONVERSATIONS.addColumn(<ColumnDefinition>{
    name: 'notes',
    type: FIELD_TYPE_TEXT,
    notNull: false,
    defaultValue: undefined,
});
TABLE_DEFINITION_CONVERSATIONS.addColumn(<ColumnDefinition>{
    name: 'isDeleted',
    type: FIELD_TYPE_BOOLEAN,
    notNull: true,
    defaultValue: undefined,
});
TABLE_DEFINITION_CONVERSATIONS.addColumn(<ColumnDefinition>{
    name: 'isLayoutAuto',
    type: FIELD_TYPE_BOOLEAN,
    notNull: true,
    defaultValue: undefined,
});
TABLE_DEFINITION_CONVERSATIONS.addColumn(<ColumnDefinition>{
    name: 'isLayoutVertical',
    type: FIELD_TYPE_BOOLEAN,
    notNull: true,
    defaultValue: undefined,
});
TABLE_DEFINITION_CONVERSATIONS.setPrimaryKey('id');
