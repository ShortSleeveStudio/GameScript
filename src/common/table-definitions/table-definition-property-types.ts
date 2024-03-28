import { FIELD_TYPE_INTEGER, FIELD_TYPE_TEXT, TABLE_PROPERTY_TYPES } from '../common-types';
import { TableDefinition, type ColumnDefinition } from './table-definitions';

export const TABLE_DEFINITION_PROPERTY_TYPES: TableDefinition = new TableDefinition(
    TABLE_PROPERTY_TYPES,
);
TABLE_DEFINITION_PROPERTY_TYPES.addColumn(<ColumnDefinition>{
    name: 'id',
    type: FIELD_TYPE_INTEGER,
    notNull: false,
    defaultValue: undefined,
});
TABLE_DEFINITION_PROPERTY_TYPES.addColumn(<ColumnDefinition>{
    name: 'name',
    type: FIELD_TYPE_TEXT,
    notNull: true,
    defaultValue: undefined,
});
TABLE_DEFINITION_PROPERTY_TYPES.setPrimaryKey('id');
