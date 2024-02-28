import { type Row } from './common-schema';
import { type DatabaseTableType } from './common-types';

export function updateRowQuery(tableType: DatabaseTableType, row: Row): [string, unknown[]] {
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
