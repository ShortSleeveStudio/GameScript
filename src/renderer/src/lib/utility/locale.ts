/**Helper to convert locale ids to column names. */
export function localeIdToColumn(id: number): string {
    return LOCALE_COLUMN_PREFIX + id;
}

export const LOCALE_COLUMN_PREFIX = 'locale_';
