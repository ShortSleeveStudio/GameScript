import type {
    ColumnState,
    GridApi,
    INumberFilterParams,
    ITextFilterParams,
} from '@ag-grid-community/core';
import type { Row } from '@lib/api/db/db-schema';
import type { IDbRowView } from '@lib/api/db/db-view-row-interface';
import { get } from 'svelte/store';

export const GRID_CACHE_BLOCK_SIZE: number = 100;
export const GRID_CACHE_MAX_BLOCKS: number = 3;
export const GRID_FILTER_PARAMS_TEXT: ITextFilterParams = {
    filterOptions: ['equals', 'notEqual', 'contains', 'notContains', 'startsWith', 'endsWith'],
};
export const GRID_FILTER_PARAMS_NUMBER: INumberFilterParams = {
    filterOptions: [
        'equals',
        'notEqual',
        'lessThan',
        'lessThanOrEqual',
        'greaterThan',
        'greaterThanOrEqual',
    ],
};

export function loadGridLayout(
    api: GridApi,
    storageKey: string,
    validColumnIds: Set<string>,
): void {
    const savedStateString: string | null = localStorage.getItem(storageKey);
    if (savedStateString) {
        const savedState: ColumnState[] = JSON.parse(savedStateString);
        // Remove any missing columns
        const sanitizedSavedState: ColumnState[] = [];
        for (let i = 0; i < savedState.length; i++) {
            const state: ColumnState = savedState[i];
            if (validColumnIds.has(state.colId)) {
                sanitizedSavedState.push(state);
            }
        }
        api.applyColumnState({ state: sanitizedSavedState });
    }
}

export function getCopyOfSelectedAndDeselect<RowType extends Row>(
    api: GridApi,
    selectedRows: IDbRowView<RowType>[],
): RowType[] {
    const selected: RowType[] = selectedRows.map((rowView) => <RowType>{ ...get(rowView) });
    api.deselectAll();
    return selected;
}
