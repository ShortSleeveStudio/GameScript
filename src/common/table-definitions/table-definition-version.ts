import { FIELD_TYPE_INTEGER, FIELD_TYPE_TEXT, TABLE_VERSION } from '../common-types';
import { ColumnDefinition, TableDefinition } from './table-definitions';

export const TABLE_DEFINITION_VERSION: TableDefinition = new TableDefinition(TABLE_VERSION);
TABLE_DEFINITION_VERSION.addColumn(<ColumnDefinition>{
    name: 'id',
    type: FIELD_TYPE_INTEGER,
    notNull: false,
    defaultValue: undefined,
});
TABLE_DEFINITION_VERSION.addColumn(<ColumnDefinition>{
    name: 'version',
    type: FIELD_TYPE_TEXT,
    notNull: true,
    defaultValue: undefined,
});
TABLE_DEFINITION_VERSION.setPrimaryKey('id');
