import { type Row } from './common-schema';
import { type Table } from './common-types';

export type RowUpdateQueryBuilder = (tableType: Table, row: Row) => [string, unknown[]];

export function bulkUpdateQuerySqlite(
    tableType: Table,
    row: Row,
    filterString: string,
): [string, unknown[]] {
    let keyValuePairs: string = '';
    const argumentArray: unknown[] = [];
    for (const prop in row) {
        // We add id last
        if (prop === 'id') continue;
        if (argumentArray.length >= 1) keyValuePairs += ', ';
        keyValuePairs += `${prop} = ?`;
        const value: unknown = row[prop];
        argumentArray.push(typeof value === 'boolean' ? (value ? 1 : 0) : value);
    }

    return [`UPDATE ${tableType.name} SET ${keyValuePairs} ${filterString}`, argumentArray];
}

export function bulkUpdateQueryPostgres(
    tableType: Table,
    row: Row,
    filterString: string,
): [string, unknown[]] {
    let keyValuePairs: string = '';
    const argumentArray: unknown[] = [];
    for (const prop in row) {
        // We add id last
        if (prop === 'id') continue;
        if (argumentArray.length >= 1) keyValuePairs += ', ';
        keyValuePairs += `${prop} = $${argumentArray.length + 1}`;
        const value: unknown = row[prop];
        argumentArray.push(value);
    }
    return [`UPDATE ${tableType.name} SET ${keyValuePairs} ${filterString};`, argumentArray];
}

export function updateRowQuerySqlite(tableType: Table, row: Row): [string, unknown[]] {
    let keyValuePairs: string = '';
    const argumentArray: unknown[] = [];
    for (const prop in row) {
        // We add id last
        if (prop === 'id') continue;
        if (argumentArray.length >= 1) keyValuePairs += ', ';
        keyValuePairs += `${prop} = ?`;
        const value: unknown = row[prop];
        argumentArray.push(typeof value === 'boolean' ? (value ? 1 : 0) : value);
    }
    argumentArray.push(row.id);
    return [`UPDATE ${tableType.name} SET ${keyValuePairs} WHERE id = ?;`, argumentArray];
}

export function updateRowQueryPostgres(tableType: Table, row: Row): [string, unknown[]] {
    let keyValuePairs: string = '';
    const argumentArray: unknown[] = [];
    for (const prop in row) {
        // We add id last
        if (prop === 'id') continue;
        if (argumentArray.length >= 1) keyValuePairs += ', ';
        keyValuePairs += `${prop} = $${argumentArray.length + 1}`;
        const value: unknown = row[prop];
        argumentArray.push(value);
    }
    argumentArray.push(row.id);
    return [
        `UPDATE ${tableType.name} SET ${keyValuePairs} WHERE id = $${argumentArray.length};`,
        argumentArray,
    ];
}
