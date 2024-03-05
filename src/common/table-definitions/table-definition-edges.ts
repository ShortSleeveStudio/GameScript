import {
    FIELD_TYPE_INTEGER,
    FIELD_TYPE_TEXT,
    TABLE_CONVERSATIONS,
    TABLE_EDGES,
    TABLE_NODES,
} from '../common-types';
import { TableDefinition, type ColumnDefinition } from './table-definitions';

export const TABLE_DEFINITION_EDGES: TableDefinition = new TableDefinition(TABLE_EDGES);
TABLE_DEFINITION_EDGES.addColumn(<ColumnDefinition>{
    name: 'id',
    type: FIELD_TYPE_INTEGER,
    notNull: false,
    defaultValue: undefined,
});
TABLE_DEFINITION_EDGES.addColumn(<ColumnDefinition>{
    name: 'name',
    type: FIELD_TYPE_TEXT,
    notNull: false,
    defaultValue: undefined,
});
TABLE_DEFINITION_EDGES.addColumn(<ColumnDefinition>{
    name: 'parent',
    type: FIELD_TYPE_INTEGER,
    notNull: true,
    defaultValue: undefined,
});
TABLE_DEFINITION_EDGES.addColumn(<ColumnDefinition>{
    name: 'priority',
    type: FIELD_TYPE_INTEGER,
    notNull: false,
    defaultValue: 0,
});
TABLE_DEFINITION_EDGES.addColumn(<ColumnDefinition>{
    name: 'notes',
    type: FIELD_TYPE_TEXT,
    notNull: false,
    defaultValue: undefined,
});
TABLE_DEFINITION_EDGES.addColumn(<ColumnDefinition>{
    name: 'type',
    type: FIELD_TYPE_INTEGER,
    notNull: true,
    defaultValue: undefined,
});
TABLE_DEFINITION_EDGES.addColumn(<ColumnDefinition>{
    name: 'source',
    type: FIELD_TYPE_INTEGER,
    notNull: true,
    defaultValue: undefined,
});
TABLE_DEFINITION_EDGES.addColumn(<ColumnDefinition>{
    name: 'target',
    type: FIELD_TYPE_INTEGER,
    notNull: true,
    defaultValue: undefined,
});

TABLE_DEFINITION_EDGES.setPrimaryKey('id');
TABLE_DEFINITION_EDGES.addUnique({
    columns: ['parent', 'source', 'target'],
});

TABLE_DEFINITION_EDGES.addForeignKey({
    column: 'parent',
    table: TABLE_CONVERSATIONS,
});
TABLE_DEFINITION_EDGES.addForeignKey({
    column: 'source',
    table: TABLE_NODES,
});
TABLE_DEFINITION_EDGES.addForeignKey({
    column: 'target',
    table: TABLE_NODES,
});
