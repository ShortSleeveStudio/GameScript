import {
    FIELD_TYPE_BOOLEAN,
    FIELD_TYPE_DECIMAL,
    FIELD_TYPE_INTEGER,
    FIELD_TYPE_TEXT,
    TABLE_NODES,
    TABLE_NODE_PROPERTIES,
    TABLE_NODE_PROPERTY_TEMPLATES,
} from '../common-types';
import { TableDefinition, type ColumnDefinition } from './table-definitions';

export const TABLE_DEFINITION_NODE_PROPERTIES: TableDefinition = new TableDefinition(
    TABLE_NODE_PROPERTIES,
);
TABLE_DEFINITION_NODE_PROPERTIES.addColumn(<ColumnDefinition>{
    name: 'id',
    type: FIELD_TYPE_INTEGER,
    notNull: false,
    defaultValue: undefined,
});
TABLE_DEFINITION_NODE_PROPERTIES.addColumn(<ColumnDefinition>{
    name: 'parent',
    type: FIELD_TYPE_INTEGER,
    notNull: true,
    defaultValue: undefined,
});
TABLE_DEFINITION_NODE_PROPERTIES.addColumn(<ColumnDefinition>{
    name: 'template',
    type: FIELD_TYPE_INTEGER,
    notNull: false,
    defaultValue: undefined,
});
TABLE_DEFINITION_NODE_PROPERTIES.addColumn(<ColumnDefinition>{
    name: 'value_string',
    type: FIELD_TYPE_TEXT,
    notNull: false,
    defaultValue: undefined,
});
TABLE_DEFINITION_NODE_PROPERTIES.addColumn(<ColumnDefinition>{
    name: 'value_integer',
    type: FIELD_TYPE_INTEGER,
    notNull: false,
    defaultValue: undefined,
});
TABLE_DEFINITION_NODE_PROPERTIES.addColumn(<ColumnDefinition>{
    name: 'value_decimal',
    type: FIELD_TYPE_DECIMAL,
    notNull: false,
    defaultValue: undefined,
});
TABLE_DEFINITION_NODE_PROPERTIES.addColumn(<ColumnDefinition>{
    name: 'value_boolean',
    type: FIELD_TYPE_BOOLEAN,
    notNull: false,
    defaultValue: undefined,
});
TABLE_DEFINITION_NODE_PROPERTIES.setPrimaryKey('id');
TABLE_DEFINITION_NODE_PROPERTIES.addForeignKey({
    column: 'parent',
    table: TABLE_NODES,
    cascadeOnDelete: false,
});
TABLE_DEFINITION_NODE_PROPERTIES.addForeignKey({
    column: 'template',
    table: TABLE_NODE_PROPERTY_TEMPLATES,
    cascadeOnDelete: false,
});
