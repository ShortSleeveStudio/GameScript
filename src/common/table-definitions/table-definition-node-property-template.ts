import {
    FIELD_TYPE_INTEGER,
    FIELD_TYPE_TEXT,
    TABLE_NODE_PROPERTY_TEMPLATES,
} from '../common-types';
import { TableDefinition, type ColumnDefinition } from './table-definitions';

export const TABLE_DEFINITION_NODE_PROPERTY_TEMPLATES: TableDefinition = new TableDefinition(
    TABLE_NODE_PROPERTY_TEMPLATES,
);
TABLE_DEFINITION_NODE_PROPERTY_TEMPLATES.addColumn(<ColumnDefinition>{
    name: 'id',
    type: FIELD_TYPE_INTEGER,
    notNull: false,
    defaultValue: undefined,
});
TABLE_DEFINITION_NODE_PROPERTY_TEMPLATES.addColumn(<ColumnDefinition>{
    name: 'name',
    type: FIELD_TYPE_TEXT,
    notNull: true,
    defaultValue: undefined,
});
TABLE_DEFINITION_NODE_PROPERTY_TEMPLATES.addColumn(<ColumnDefinition>{
    name: 'type',
    type: FIELD_TYPE_INTEGER,
    notNull: true,
    defaultValue: undefined,
});
TABLE_DEFINITION_NODE_PROPERTY_TEMPLATES.setPrimaryKey('id');