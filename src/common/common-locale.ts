export function localeIdToColumn(id: number): string {
    return LOCALE_COLUMN_PREFIX + id;
}
export function localeColumnToId(column: string): number {
    const id: number = parseInt(column.substring(LOCALE_COLUMN_PREFIX.length));
    if (isNaN(id)) throw new Error('Failed to parse locale column name');
    return id;
}

export const LOCALE_COLUMN_PREFIX = 'locale_';
