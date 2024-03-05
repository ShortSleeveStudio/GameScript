import {
    FIELD_TYPE_BOOLEAN,
    FIELD_TYPE_DECIMAL,
    FIELD_TYPE_INTEGER,
    FIELD_TYPE_TEXT,
    type FieldType,
} from '../common-types';
import type {
    ColumnDefinition,
    ForeignKeyDefinition,
    TableDefinition,
    UniqueDefinition,
} from '../table-definitions/table-definitions';
import { EXPORT_DUMMY_TABLE_PREFIX, EXPORT_ORIGINAL_ID_COLUMN_NAME } from './table-generator';

export function generateTableSqlite(table: TableDefinition, isExportHelper: boolean): string {
    let createString: string = '';
    createString += `CREATE TABLE IF NOT EXISTS "${
        table.tableType.name + (isExportHelper ? EXPORT_DUMMY_TABLE_PREFIX : '')
    }"\n`;
    // Columns
    createString += `(\n`;
    for (let i = 0; i < table.columns.length; i++) {
        const definition: ColumnDefinition = table.columns[i];
        createString += `"${definition.name}"`;
        createString += ` ${sqliteTypeForFieldType(definition.type)}`;
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
        if (isExportHelper && i === table.columns.length - 1) {
            createString += ',\n';
            createString += `"${EXPORT_ORIGINAL_ID_COLUMN_NAME}" INTEGER`;
        }
        createString += ',\n';
    }

    // Uniques
    for (let i = 0; i < table.uniques.length; i++) {
        const definition: UniqueDefinition = table.uniques[i];
        createString += `UNIQUE(${definition.columns.join(',')}),\n`;
    }
    // Foreign Keys
    if (!isExportHelper) {
        for (let i = 0; i < table.foreignKeys.length; i++) {
            const definition: ForeignKeyDefinition = table.foreignKeys[i];
            createString += `FOREIGN KEY("${definition.column}") REFERENCES "${definition.table.name}",\n`;
        }
    }

    // Primary Key
    createString += `PRIMARY KEY("${table.primaryKey}" AUTOINCREMENT)\n`;
    createString += `);`;

    return createString;
}

function sqliteTypeForFieldType(type: FieldType): string {
    switch (type) {
        case FIELD_TYPE_DECIMAL:
            return 'NUMERIC';
        case FIELD_TYPE_INTEGER:
            return 'INTEGER';
        case FIELD_TYPE_TEXT:
            return 'TEXT';
        case FIELD_TYPE_BOOLEAN:
            return 'INTEGER';
        default:
            throw new Error(`Unknown SQLite type: ${type}`);
    }
}
