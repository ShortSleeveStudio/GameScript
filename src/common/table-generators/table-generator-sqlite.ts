import {
    FIELD_TYPE_BOOLEAN,
    FIELD_TYPE_DECIMAL,
    FIELD_TYPE_INTEGER,
    FIELD_TYPE_LONG,
    FIELD_TYPE_TEXT,
    FieldTypeId,
} from '../common-types';
import type {
    ColumnDefinition,
    ForeignKeyDefinition,
    TableDefinition,
    UniqueDefinition,
} from '../table-definitions/table-definitions';

export function generateTableSqlite(table: TableDefinition): string {
    let createString: string = '';
    createString += `CREATE TABLE IF NOT EXISTS "${table.tableType.name}"\n`;
    // Columns
    createString += `(\n`;
    for (let i = 0; i < table.columns.length; i++) {
        const definition: ColumnDefinition = table.columns[i];
        createString += `"${definition.name}"`;
        createString += ` ${typeForFieldTypeSqlite(definition.type.id)}`;
        if (definition.notNull) {
            createString += ` NOT NULL`;
        }
        switch (definition.defaultValue) {
            case undefined:
                break;
            case null:
                createString += ` DEFAULT NULL`;
                break;
            default: {
                const typeOf: string = typeof definition.defaultValue;
                if (typeOf === 'string') {
                    createString += ` DEFAULT "${definition.defaultValue}"`;
                } else if (typeOf === 'number') {
                    createString += ` DEFAULT ${definition.defaultValue}`;
                } else if (typeOf === 'boolean') {
                    createString += ` DEFAULT ${definition.defaultValue ? '1' : '0'}`;
                } else {
                    throw new Error(`Unknown default value type: ${typeOf}`);
                }
                break;
            }
        }
        createString += ',\n';
    }

    // Uniques
    for (let i = 0; i < table.uniques.length; i++) {
        const definition: UniqueDefinition = table.uniques[i];
        createString += `UNIQUE(${definition.columns.join(',')}),\n`;
    }
    // Foreign Keys
    for (let i = 0; i < table.foreignKeys.length; i++) {
        const definition: ForeignKeyDefinition = table.foreignKeys[i];
        createString += `
        FOREIGN KEY("${definition.column}") REFERENCES "${definition.table.name}" ${
            definition.cascadeOnDelete ? 'ON DELETE CASCADE' : ''
        },\n`;
    }

    // Primary Key
    createString += `PRIMARY KEY("${table.primaryKey}" AUTOINCREMENT)\n`;
    createString += `);`;

    return createString;
}

export function typeForFieldTypeSqlite(type: FieldTypeId): string {
    switch (type) {
        case FIELD_TYPE_DECIMAL.id:
            return 'NUMERIC';
        case FIELD_TYPE_INTEGER.id:
            return 'INTEGER';
        case FIELD_TYPE_TEXT.id:
            return 'TEXT';
        case FIELD_TYPE_BOOLEAN.id:
            return 'INTEGER';
        case FIELD_TYPE_LONG.id:
            return 'INTEGER';
        default:
            throw new Error(`Unknown SQLite type: ${type}`);
    }
}
