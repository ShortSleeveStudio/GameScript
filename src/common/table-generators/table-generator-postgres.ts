import {
    FIELD_TYPE_BOOLEAN,
    FIELD_TYPE_DECIMAL,
    FIELD_TYPE_INTEGER,
    FIELD_TYPE_TEXT,
    FieldTypeId,
} from '../common-types';
import type {
    ColumnDefinition,
    ForeignKeyDefinition,
    TableDefinition,
    UniqueDefinition,
} from '../table-definitions/table-definitions';

export function generateTablePostgres(table: TableDefinition): string {
    let createString: string = '';
    createString += `CREATE TABLE IF NOT EXISTS "${table.tableType.name}"\n`;
    // Columns
    createString += `(\n`;
    for (let i = 0; i < table.columns.length; i++) {
        const definition: ColumnDefinition = table.columns[i];
        const isPrimaryKey: boolean = definition.name === table.primaryKey;
        createString += `"${definition.name}"`;
        createString += ` ${typeForFieldTypePostgres(definition.type.id, isPrimaryKey)}`;
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
                    createString += ` DEFAULT ${definition.defaultValue ? 'true' : 'false'}`;
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
        FOREIGN KEY ("${definition.column}") REFERENCES "${definition.table.name}",\n`;
    }

    // Primary Key
    createString += `PRIMARY KEY("${table.primaryKey}")\n`;
    createString += `);`;

    return createString;
}

export function typeForFieldTypePostgres(type: FieldTypeId, isPrimaryKey: boolean): string {
    if (isPrimaryKey) return 'serial';
    switch (type) {
        case FIELD_TYPE_DECIMAL.id:
            return 'numeric';
        case FIELD_TYPE_INTEGER.id:
            return 'integer';
        case FIELD_TYPE_TEXT.id:
            return 'text';
        case FIELD_TYPE_BOOLEAN.id:
            return 'boolean';
        default:
            throw new Error(`Unknown Postgres type: ${type}`);
    }
}
