export function filterIdToColumn(id: number): string {
    return COLUMN_PREFIX_FILTER + id;
}
export const COLUMN_PREFIX_FILTER = 'filter_';
