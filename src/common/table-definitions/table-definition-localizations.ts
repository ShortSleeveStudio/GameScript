import {
    FIELD_TYPE_BOOLEAN,
    FIELD_TYPE_INTEGER,
    FIELD_TYPE_TEXT,
    TABLE_CONVERSATIONS,
    TABLE_LOCALIZATIONS,
} from '../common-types';
import { TableDefinition, type ColumnDefinition } from './table-definitions';

export const TABLE_DEFINITION_LOCALIZATIONS: TableDefinition = new TableDefinition(
    TABLE_LOCALIZATIONS,
);
TABLE_DEFINITION_LOCALIZATIONS.addColumn(<ColumnDefinition>{
    name: 'id',
    type: FIELD_TYPE_INTEGER,
    notNull: false,
    defaultValue: undefined,
});
TABLE_DEFINITION_LOCALIZATIONS.addColumn(<ColumnDefinition>{
    name: 'name',
    type: FIELD_TYPE_TEXT,
    notNull: false,
    defaultValue: undefined,
});
TABLE_DEFINITION_LOCALIZATIONS.addColumn(<ColumnDefinition>{
    name: 'parent',
    type: FIELD_TYPE_INTEGER,
    notNull: false,
    defaultValue: undefined,
});
TABLE_DEFINITION_LOCALIZATIONS.addColumn(<ColumnDefinition>{
    name: 'is_system_created',
    type: FIELD_TYPE_BOOLEAN,
    notNull: true,
    defaultValue: undefined,
});
TABLE_DEFINITION_LOCALIZATIONS.setPrimaryKey('id');
TABLE_DEFINITION_LOCALIZATIONS.addForeignKey({
    column: 'parent',
    table: TABLE_CONVERSATIONS,
    cascadeOnDelete: false,
});
