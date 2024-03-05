import { FIELD_TYPE_INTEGER, FIELD_TYPE_TEXT, TABLE_FILTERS } from '../common-types';
import { TableDefinition, type ColumnDefinition } from './table-definitions';

export const TABLE_DEFINITION_FILTERS: TableDefinition = new TableDefinition(TABLE_FILTERS);
TABLE_DEFINITION_FILTERS.addColumn(<ColumnDefinition>{
    name: 'id',
    type: FIELD_TYPE_INTEGER,
    notNull: false,
    defaultValue: undefined,
});
TABLE_DEFINITION_FILTERS.addColumn(<ColumnDefinition>{
    name: 'name',
    type: FIELD_TYPE_TEXT,
    notNull: true,
    defaultValue: undefined,
});
TABLE_DEFINITION_FILTERS.addColumn(<ColumnDefinition>{
    name: 'notes',
    type: FIELD_TYPE_TEXT,
    notNull: false,
    defaultValue: undefined,
});
TABLE_DEFINITION_FILTERS.setPrimaryKey('id');
