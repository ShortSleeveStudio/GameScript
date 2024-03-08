import { FIELD_TYPE_INTEGER, FIELD_TYPE_TEXT, TABLE_SYSTEM } from '../common-types';
import { ColumnDefinition, TableDefinition } from './table-definitions';

export const TABLE_DEFINITION_SYSTEM: TableDefinition = new TableDefinition(TABLE_SYSTEM);
TABLE_DEFINITION_SYSTEM.addColumn(<ColumnDefinition>{
    name: 'id',
    type: FIELD_TYPE_INTEGER,
    notNull: false,
    defaultValue: undefined,
});
TABLE_DEFINITION_SYSTEM.addColumn(<ColumnDefinition>{
    name: 'version',
    type: FIELD_TYPE_TEXT,
    notNull: true,
    defaultValue: undefined,
});
TABLE_DEFINITION_SYSTEM.setPrimaryKey('id');
