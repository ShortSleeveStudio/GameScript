import { FIELD_TYPE_INTEGER, TABLE_ACTORS, TABLE_ACTOR_PRINCIPAL } from '../common-types';
import { TableDefinition, type ColumnDefinition } from './table-definitions';

export const TABLE_DEFINITION_ACTOR_PRINCIPAL: TableDefinition = new TableDefinition(
    TABLE_ACTOR_PRINCIPAL,
);
TABLE_DEFINITION_ACTOR_PRINCIPAL.addColumn(<ColumnDefinition>{
    name: 'id',
    type: FIELD_TYPE_INTEGER,
    notNull: false,
    defaultValue: undefined,
});
TABLE_DEFINITION_ACTOR_PRINCIPAL.addColumn(<ColumnDefinition>{
    name: 'principal',
    type: FIELD_TYPE_INTEGER,
    notNull: true,
    defaultValue: undefined,
});
TABLE_DEFINITION_ACTOR_PRINCIPAL.setPrimaryKey('id');
TABLE_DEFINITION_ACTOR_PRINCIPAL.addForeignKey({
    column: 'principal',
    table: TABLE_ACTORS,
    cascadeOnDelete: false,
});
