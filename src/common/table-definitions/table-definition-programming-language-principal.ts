import {
    FIELD_TYPE_INTEGER,
    TABLE_PROGRAMMING_LANGUAGES,
    TABLE_PROGRAMMING_LANGUAGE_PRINCIPAL,
} from '../common-types';
import { TableDefinition, type ColumnDefinition } from './table-definitions';

export const TABLE_DEFINITION_PROGRAMMING_LANGUAGE_PRINCIPAL: TableDefinition = new TableDefinition(
    TABLE_PROGRAMMING_LANGUAGE_PRINCIPAL,
);
TABLE_DEFINITION_PROGRAMMING_LANGUAGE_PRINCIPAL.addColumn(<ColumnDefinition>{
    name: 'id',
    type: FIELD_TYPE_INTEGER,
    notNull: false,
    defaultValue: undefined,
});
TABLE_DEFINITION_PROGRAMMING_LANGUAGE_PRINCIPAL.addColumn(<ColumnDefinition>{
    name: 'principal',
    type: FIELD_TYPE_INTEGER,
    notNull: false,
    defaultValue: undefined,
});
TABLE_DEFINITION_PROGRAMMING_LANGUAGE_PRINCIPAL.setPrimaryKey('id');
TABLE_DEFINITION_PROGRAMMING_LANGUAGE_PRINCIPAL.addForeignKey({
    column: 'principal',
    table: TABLE_PROGRAMMING_LANGUAGES,
});
