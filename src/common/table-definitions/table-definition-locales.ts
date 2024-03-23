import {
    FIELD_TYPE_BOOLEAN,
    FIELD_TYPE_INTEGER,
    FIELD_TYPE_TEXT,
    TABLE_LOCALES,
    TABLE_LOCALIZATIONS,
} from '../common-types';
import { TableDefinition, type ColumnDefinition } from './table-definitions';

export const TABLE_DEFINITION_LOCALES: TableDefinition = new TableDefinition(TABLE_LOCALES);
TABLE_DEFINITION_LOCALES.addColumn(<ColumnDefinition>{
    name: 'id',
    type: FIELD_TYPE_INTEGER,
    notNull: false,
    defaultValue: undefined,
});
TABLE_DEFINITION_LOCALES.addColumn(<ColumnDefinition>{
    name: 'name',
    type: FIELD_TYPE_TEXT,
    notNull: true,
    defaultValue: undefined,
});
TABLE_DEFINITION_LOCALES.addColumn(<ColumnDefinition>{
    name: 'is_system_created',
    type: FIELD_TYPE_BOOLEAN,
    notNull: true,
    defaultValue: undefined,
});
TABLE_DEFINITION_LOCALES.addColumn(<ColumnDefinition>{
    name: 'localized_name',
    type: FIELD_TYPE_INTEGER,
    notNull: true,
    defaultValue: undefined,
});
TABLE_DEFINITION_LOCALES.setPrimaryKey('id');
TABLE_DEFINITION_LOCALES.addForeignKey({
    column: 'localized_name',
    table: TABLE_LOCALIZATIONS,
});
