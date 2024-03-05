import { FIELD_TYPE_INTEGER, FIELD_TYPE_TEXT, TABLE_PROGRAMMING_LANGUAGES } from '../common-types';
import { TableDefinition, type ColumnDefinition } from './table-definitions';

export const TABLE_DEFINITION_PROGRAMMING_LANGUAGES: TableDefinition = new TableDefinition(
    TABLE_PROGRAMMING_LANGUAGES,
);
TABLE_DEFINITION_PROGRAMMING_LANGUAGES.addColumn(<ColumnDefinition>{
    name: 'id',
    type: FIELD_TYPE_INTEGER,
    notNull: false,
    defaultValue: undefined,
});
TABLE_DEFINITION_PROGRAMMING_LANGUAGES.addColumn(<ColumnDefinition>{
    name: 'name',
    type: FIELD_TYPE_TEXT,
    notNull: true,
    defaultValue: undefined,
});
TABLE_DEFINITION_PROGRAMMING_LANGUAGES.setPrimaryKey('id');
TABLE_DEFINITION_PROGRAMMING_LANGUAGES.addUnique({ columns: ['name'] });
