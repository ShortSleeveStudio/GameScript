import {
    FIELD_TYPE_BOOLEAN,
    FIELD_TYPE_DECIMAL,
    FIELD_TYPE_INTEGER,
    FIELD_TYPE_TEXT,
    TABLE_ACTORS,
    TABLE_CONVERSATIONS,
    TABLE_LOCALIZATIONS,
    TABLE_NODES,
    TABLE_ROUTINES,
} from '../common-types';
import { TableDefinition, type ColumnDefinition } from './table-definitions';

export const TABLE_DEFINITION_NODES: TableDefinition = new TableDefinition(TABLE_NODES);
TABLE_DEFINITION_NODES.addColumn(<ColumnDefinition>{
    name: 'id',
    type: FIELD_TYPE_INTEGER,
    notNull: false,
    defaultValue: undefined,
});
TABLE_DEFINITION_NODES.addColumn(<ColumnDefinition>{
    name: 'parent',
    type: FIELD_TYPE_INTEGER,
    notNull: true,
    defaultValue: undefined,
});
TABLE_DEFINITION_NODES.addColumn(<ColumnDefinition>{
    name: 'actor',
    type: FIELD_TYPE_INTEGER,
    notNull: true,
    defaultValue: undefined,
});
TABLE_DEFINITION_NODES.addColumn(<ColumnDefinition>{
    name: 'uiResponseText',
    type: FIELD_TYPE_INTEGER,
    notNull: true,
    defaultValue: undefined,
});
TABLE_DEFINITION_NODES.addColumn(<ColumnDefinition>{
    name: 'voiceText',
    type: FIELD_TYPE_INTEGER,
    notNull: true,
    defaultValue: undefined,
});
TABLE_DEFINITION_NODES.addColumn(<ColumnDefinition>{
    name: 'condition',
    type: FIELD_TYPE_INTEGER,
    notNull: true,
    defaultValue: undefined,
});
TABLE_DEFINITION_NODES.addColumn(<ColumnDefinition>{
    name: 'code',
    type: FIELD_TYPE_INTEGER,
    notNull: true,
    defaultValue: undefined,
});
TABLE_DEFINITION_NODES.addColumn(<ColumnDefinition>{
    name: 'codeOverride',
    type: FIELD_TYPE_INTEGER,
    notNull: false,
    defaultValue: undefined,
});
TABLE_DEFINITION_NODES.addColumn(<ColumnDefinition>{
    name: 'isPreventResponse',
    type: FIELD_TYPE_BOOLEAN,
    notNull: false,
    defaultValue: 0,
});
TABLE_DEFINITION_NODES.addColumn(<ColumnDefinition>{
    name: 'notes',
    type: FIELD_TYPE_TEXT,
    notNull: false,
    defaultValue: undefined,
});
TABLE_DEFINITION_NODES.addColumn(<ColumnDefinition>{
    name: 'isSystemCreated',
    type: FIELD_TYPE_BOOLEAN,
    notNull: true,
    defaultValue: undefined,
});
TABLE_DEFINITION_NODES.addColumn(<ColumnDefinition>{
    name: 'type',
    type: FIELD_TYPE_TEXT,
    notNull: true,
    defaultValue: undefined,
});
TABLE_DEFINITION_NODES.addColumn(<ColumnDefinition>{
    name: 'positionX',
    type: FIELD_TYPE_DECIMAL,
    notNull: false,
    defaultValue: 0,
});
TABLE_DEFINITION_NODES.addColumn(<ColumnDefinition>{
    name: 'positionY',
    type: FIELD_TYPE_DECIMAL,
    notNull: false,
    defaultValue: 0,
});
TABLE_DEFINITION_NODES.setPrimaryKey('id');
TABLE_DEFINITION_NODES.addForeignKey({
    column: 'actor',
    table: TABLE_ACTORS,
});
TABLE_DEFINITION_NODES.addForeignKey({
    column: 'uiResponseText',
    table: TABLE_LOCALIZATIONS,
});
TABLE_DEFINITION_NODES.addForeignKey({
    column: 'voiceText',
    table: TABLE_LOCALIZATIONS,
});
TABLE_DEFINITION_NODES.addForeignKey({
    column: 'parent',
    table: TABLE_CONVERSATIONS,
});
TABLE_DEFINITION_NODES.addForeignKey({
    column: 'condition',
    table: TABLE_ROUTINES,
});
TABLE_DEFINITION_NODES.addForeignKey({
    column: 'code',
    table: TABLE_ROUTINES,
});
