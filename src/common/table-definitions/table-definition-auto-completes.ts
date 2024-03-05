import { FIELD_TYPE_INTEGER, FIELD_TYPE_TEXT, TABLE_AUTO_COMPLETES } from '../common-types';
import { TableDefinition, type ColumnDefinition } from './table-definitions';

export const TABLE_DEFINITION_AUTO_COMPLETES: TableDefinition = new TableDefinition(
    TABLE_AUTO_COMPLETES,
);
TABLE_DEFINITION_AUTO_COMPLETES.addColumn(<ColumnDefinition>{
    name: 'id',
    type: FIELD_TYPE_INTEGER,
    notNull: false,
    defaultValue: undefined,
});
TABLE_DEFINITION_AUTO_COMPLETES.addColumn(<ColumnDefinition>{
    name: 'name',
    type: FIELD_TYPE_TEXT,
    notNull: false,
    defaultValue: undefined,
});
TABLE_DEFINITION_AUTO_COMPLETES.addColumn(<ColumnDefinition>{
    name: 'icon',
    type: FIELD_TYPE_INTEGER,
    notNull: true,
    defaultValue: undefined,
});
TABLE_DEFINITION_AUTO_COMPLETES.addColumn(<ColumnDefinition>{
    name: 'rule',
    type: FIELD_TYPE_INTEGER,
    notNull: true,
    defaultValue: undefined,
});
TABLE_DEFINITION_AUTO_COMPLETES.addColumn(<ColumnDefinition>{
    name: 'insertion',
    type: FIELD_TYPE_TEXT,
    notNull: false,
    defaultValue: undefined,
});
TABLE_DEFINITION_AUTO_COMPLETES.addColumn(<ColumnDefinition>{
    name: 'documentation',
    type: FIELD_TYPE_TEXT,
    notNull: false,
    defaultValue: undefined,
});
TABLE_DEFINITION_AUTO_COMPLETES.setPrimaryKey('id');
