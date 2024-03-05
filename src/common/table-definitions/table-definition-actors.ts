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
    name: 'localizedName',
    type: FIELD_TYPE_INTEGER,
    notNull: true,
    defaultValue: undefined,
});
TABLE_DEFINITION_ACTORS.addColumn(<ColumnDefinition>{
    name: 'isSystemCreated',
    type: FIELD_TYPE_BOOLEAN,
    notNull: true,
    defaultValue: undefined,
});
TABLE_DEFINITION_ACTORS.setPrimaryKey('id');
TABLE_DEFINITION_ACTORS.addForeignKey({
    column: 'localizedName',
    table: TABLE_LOCALIZATIONS,
});
