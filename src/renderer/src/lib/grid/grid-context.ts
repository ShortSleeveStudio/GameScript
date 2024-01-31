import type { GridApi } from '@ag-grid-community/core';

export interface GridContext {
    getGridApi(): GridApi;
}
