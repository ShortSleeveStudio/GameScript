<script lang="ts">
    import {
        createGrid,
        type ColDef,
        type GridOptions,
        type IDatasource,
        GridApi,
    } from '@ag-grid-community/core';
    import { type Filter } from '@lib/api/db/db-schema';
    import type { IDbRowView } from '@lib/api/db/db-view-row-interface';
    import { GridCellRenderer } from '@lib/grid/grid-cell-renderer';
    import type { FinderContext } from '@lib/grid/finder-context';
    import { FinderDatasource } from '@lib/grid/finder-datasource';
    import { GridCellEditorText } from '@lib/grid/grid-cell-editor-text';
    import { isDarkMode } from '@lib/stores/app/darkmode';
    import { filters } from '@lib/tables/filters';
    import { filterIdToColumn } from '@lib/utility/filters';
    import { Tile } from 'carbon-components-svelte';
    import { onDestroy, onMount } from 'svelte';
    import { get } from 'svelte/store';
    import { TableWatcher } from '@lib/stores/utility/table-watcher';

    let api: GridApi;
    let finderElement: HTMLElement;
    let tableWatcher: TableWatcher<Filter>;

    const datasource: IDatasource = new FinderDatasource();
    let columnDefs: ColDef[] = [];

    const staticColumns: ColDef[] = [
        {
            pinned: 'left',
            headerName: 'ID',
            colId: 'id',
            resizable: false,
            cellRenderer: GridCellRenderer,
            type: 'nonEditableColumn',
            width: 72, // Min before the sort arrow overlaps
        },
        {
            headerName: 'Name',
            colId: 'name',
            cellEditor: GridCellEditorText,
            cellRenderer: GridCellRenderer,
        },
    ];

    function getGridApi(): GridApi {
        return api;
    }

    function onFiltersChanged(): void {
        // Grab filters
        const filterRowViews: IDbRowView<Filter>[] = get(filters);

        // Purge old columns
        columnDefs.length = 0;

        // Add static columns
        columnDefs.push.apply(columnDefs, staticColumns);

        // Add filters
        for (let i = 0; i < filterRowViews.length; i++) {
            const filter = get(filterRowViews[i]);
            columnDefs.push({
                headerName: filter.name,
                colId: filterIdToColumn(filter.id),
                cellEditor: GridCellEditorText,
                cellRenderer: GridCellRenderer,
            });
        }

        // Set new column defs
        api?.setGridOption('columnDefs', columnDefs);

        // Update column width
        api?.autoSizeAllColumns();
    }

    onMount(() => {
        const gridOptions: GridOptions = <GridOptions>{
            context: <FinderContext>{ getGridApi: getGridApi },
            rowModelType: 'infinite',
            columnDefs: columnDefs,
            defaultColDef: {
                // flex: 1,
                // resizable: false,
                suppressMovable: true,
                sortable: true,
                editable: true,
            },
            autoSizeStrategy: {
                type: 'fitCellContents',
            },
            stopEditingWhenCellsLoseFocus: true,
            datasource: datasource,
            columnTypes: {
                nonEditableColumn: {
                    editable: false,
                    cellStyle: () => {
                        return { cursor: 'not-allowed' };
                    },
                },
            },
        };
        api = createGrid(finderElement, gridOptions);

        // Create table watcher
        tableWatcher = new TableWatcher(filters);
        tableWatcher.subscribe(onFiltersChanged);
    });
    onDestroy(() => {
        tableWatcher.dispose();
    });
</script>

<div class="container">
    <Tile style="margin-bottom: 0px;">
        <h4 class="table-title">Conversations</h4>
        <p class="table-header">
            Conversations are containers for localized text and conversation nodes.
        </p>
    </Tile>
    <div class="table-toolbar"></div>
    <span
        id="finder"
        class={$isDarkMode
            ? 'ag-theme-quartz-dark ag-theme-custom'
            : 'ag-theme-quartz ag-theme-custom'}
        bind:this={finderElement}
    ></span>
</div>

<style>
    .container {
        display: flex;
        flex-direction: column;
        height: 100%;
        justify-content: flex-start;
        align-items: stretch;
    }
    .container > * {
        flex-grow: 1;
    }
    .table-title {
        font-size: var(--cds-productive-heading-03-font-size, 1.25rem);
        font-weight: var(--cds-productive-heading-03-font-weight, 400);
        line-height: var(--cds-productive-heading-03-line-height, 1.4);
        letter-spacing: var(--cds-productive-heading-03-letter-spacing, 0);
        color: var(--cds-text-primary, #161616);
    }
    .table-header {
        font-size: var(--cds-body-short-01-font-size, 0.875rem);
        font-weight: var(--cds-body-short-01-font-weight, 400);
        line-height: var(--cds-body-short-01-line-height, 1.28572);
        letter-spacing: var(--cds-body-short-01-letter-spacing, 0.16px);
        color: var(--cds-text-secondary, #525252);
        margin-bottom: 0px;
    }
    .table-toolbar {
        height: 2rem;
        flex-grow: 0;
        background-color: var(--cds-ui-01, #f4f4f4);
    }
    #finder {
        /* width: 100%; */
        /* height: 100%; */
    }
</style>
