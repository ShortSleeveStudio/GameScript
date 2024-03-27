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
    name: 'ui_response_text',
    type: FIELD_TYPE_INTEGER,
    notNull: false,
    defaultValue: undefined,
});
TABLE_DEFINITION_NODES.addColumn(<ColumnDefinition>{
    name: 'voice_text',
    type: FIELD_TYPE_INTEGER,
    notNull: false,
    defaultValue: undefined,
});
TABLE_DEFINITION_NODES.addColumn(<ColumnDefinition>{
    name: 'condition',
    type: FIELD_TYPE_INTEGER,
    notNull: false,
    defaultValue: undefined,
});
TABLE_DEFINITION_NODES.addColumn(<ColumnDefinition>{
    name: 'code',
    type: FIELD_TYPE_INTEGER,
    notNull: false,
    defaultValue: undefined,
});
TABLE_DEFINITION_NODES.addColumn(<ColumnDefinition>{
    name: 'code_override',
    type: FIELD_TYPE_INTEGER,
    notNull: false,
    defaultValue: undefined,
});
TABLE_DEFINITION_NODES.addColumn(<ColumnDefinition>{
    name: 'is_prevent_response',
    type: FIELD_TYPE_BOOLEAN,
    notNull: false,
    defaultValue: false,
});
TABLE_DEFINITION_NODES.addColumn(<ColumnDefinition>{
    name: 'notes',
    type: FIELD_TYPE_TEXT,
    notNull: false,
    defaultValue: undefined,
});
TABLE_DEFINITION_NODES.addColumn(<ColumnDefinition>{
    name: 'is_system_created',
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
    name: 'position_x',
    type: FIELD_TYPE_DECIMAL,
    notNull: false,
    defaultValue: 0,
});
TABLE_DEFINITION_NODES.addColumn(<ColumnDefinition>{
    name: 'position_y',
    type: FIELD_TYPE_DECIMAL,
    notNull: false,
    defaultValue: 0,
});
TABLE_DEFINITION_NODES.setPrimaryKey('id');
TABLE_DEFINITION_NODES.addForeignKey({
    column: 'actor',
    table: TABLE_ACTORS,
    cascadeOnDelete: false,
});
TABLE_DEFINITION_NODES.addForeignKey({
    column: 'ui_response_text',
    table: TABLE_LOCALIZATIONS,
    cascadeOnDelete: false,
});
TABLE_DEFINITION_NODES.addForeignKey({
    column: 'voice_text',
    table: TABLE_LOCALIZATIONS,
    cascadeOnDelete: false,
});
TABLE_DEFINITION_NODES.addForeignKey({
    column: 'parent',
    table: TABLE_CONVERSATIONS,
    cascadeOnDelete: false,
});
TABLE_DEFINITION_NODES.addForeignKey({
    column: 'condition',
    table: TABLE_ROUTINES,
    cascadeOnDelete: false,
});
TABLE_DEFINITION_NODES.addForeignKey({
    column: 'code',
    table: TABLE_ROUTINES,
    cascadeOnDelete: false,
});
