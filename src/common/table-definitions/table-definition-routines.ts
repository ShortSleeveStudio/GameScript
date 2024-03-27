import {
    FIELD_TYPE_BOOLEAN,
    FIELD_TYPE_INTEGER,
    FIELD_TYPE_TEXT,
    TABLE_CONVERSATIONS,
    TABLE_ROUTINES,
    TABLE_ROUTINE_TYPES,
} from '../common-types';
import { TableDefinition, type ColumnDefinition } from './table-definitions';

export const TABLE_DEFINITION_ROUTINES: TableDefinition = new TableDefinition(TABLE_ROUTINES);
TABLE_DEFINITION_ROUTINES.addColumn(<ColumnDefinition>{
    name: 'id',
    type: FIELD_TYPE_INTEGER,
    notNull: false,
    defaultValue: undefined,
});
TABLE_DEFINITION_ROUTINES.addColumn(<ColumnDefinition>{
    name: 'name',
    type: FIELD_TYPE_TEXT,
    notNull: false,
    defaultValue: undefined,
});
TABLE_DEFINITION_ROUTINES.addColumn(<ColumnDefinition>{
    name: 'code',
    type: FIELD_TYPE_TEXT,
    notNull: false,
    defaultValue: undefined,
});
TABLE_DEFINITION_ROUTINES.addColumn(<ColumnDefinition>{
    name: 'type',
    type: FIELD_TYPE_INTEGER,
    notNull: true,
    defaultValue: undefined,
});
TABLE_DEFINITION_ROUTINES.addColumn(<ColumnDefinition>{
    name: 'is_condition',
    type: FIELD_TYPE_BOOLEAN,
    notNull: true,
    defaultValue: false,
});
TABLE_DEFINITION_ROUTINES.addColumn(<ColumnDefinition>{
    name: 'notes',
    type: FIELD_TYPE_TEXT,
    notNull: false,
    defaultValue: undefined,
});
TABLE_DEFINITION_ROUTINES.addColumn(<ColumnDefinition>{
    name: 'is_system_created',
    type: FIELD_TYPE_BOOLEAN,
    notNull: true,
    defaultValue: undefined,
});
TABLE_DEFINITION_ROUTINES.addColumn(<ColumnDefinition>{
    name: 'parent',
    type: FIELD_TYPE_INTEGER,
    notNull: false,
    defaultValue: undefined,
});
TABLE_DEFINITION_ROUTINES.setPrimaryKey('id');
TABLE_DEFINITION_ROUTINES.addForeignKey({
    column: 'type',
    table: TABLE_ROUTINE_TYPES,
    cascadeOnDelete: false,
});
TABLE_DEFINITION_ROUTINES.addForeignKey({
    column: 'parent',
    table: TABLE_CONVERSATIONS,
    cascadeOnDelete: false,
});
