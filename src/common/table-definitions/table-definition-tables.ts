import { FIELD_TYPE_INTEGER, FIELD_TYPE_TEXT, TABLE_TABLES } from '../common-types';
import { TableDefinition, type ColumnDefinition } from './table-definitions';

export const TABLE_DEFINITION_TABLES: TableDefinition = new TableDefinition(TABLE_TABLES);
TABLE_DEFINITION_TABLES.addColumn(<ColumnDefinition>{
    name: 'id',
    type: FIELD_TYPE_INTEGER,
    notNull: false,
    defaultValue: undefined,
});
TABLE_DEFINITION_TABLES.addColumn(<ColumnDefinition>{
    name: 'name',
    type: FIELD_TYPE_TEXT,
    notNull: false,
    defaultValue: undefined,
});
TABLE_DEFINITION_TABLES.setPrimaryKey('id');
