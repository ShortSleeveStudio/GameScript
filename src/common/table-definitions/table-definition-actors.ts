import {
    FIELD_TYPE_BOOLEAN,
    FIELD_TYPE_INTEGER,
    FIELD_TYPE_TEXT,
    TABLE_ACTORS,
    TABLE_LOCALIZATIONS,
} from '../common-types';
import { TableDefinition, type ColumnDefinition } from './table-definitions';

export const TABLE_DEFINITION_ACTORS: TableDefinition = new TableDefinition(TABLE_ACTORS);
TABLE_DEFINITION_ACTORS.addColumn(<ColumnDefinition>{
    name: 'id',
    type: FIELD_TYPE_INTEGER,
    notNull: false,
    defaultValue: undefined,
});
TABLE_DEFINITION_ACTORS.addColumn(<ColumnDefinition>{
    name: 'name',
    type: FIELD_TYPE_TEXT,
    notNull: true,
    defaultValue: undefined,
});
TABLE_DEFINITION_ACTORS.addColumn(<ColumnDefinition>{
    name: 'color',
    type: FIELD_TYPE_TEXT,
    notNull: true,
    defaultValue: undefined,
});
TABLE_DEFINITION_ACTORS.addColumn(<ColumnDefinition>{
    name: 'localized_name',
    type: FIELD_TYPE_INTEGER,
    notNull: true,
    defaultValue: undefined,
});
TABLE_DEFINITION_ACTORS.addColumn(<ColumnDefinition>{
    name: 'is_system_created',
    type: FIELD_TYPE_BOOLEAN,
    notNull: true,
    defaultValue: undefined,
});
TABLE_DEFINITION_ACTORS.setPrimaryKey('id');
TABLE_DEFINITION_ACTORS.addForeignKey({
    column: 'localized_name',
    table: TABLE_LOCALIZATIONS,
    cascadeOnDelete: false,
});
