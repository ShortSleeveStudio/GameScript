<script lang="ts">
    /**
     * Table Options Menu component for AG-Grid panels.
     *
     * Provides a consistent ActionMenu with common grid operations:
     * - Clear Filters
     * - Clear Sort
     * - Show Columns (opens AG-Grid's column chooser)
     * - Show/Hide Tags (toggle tag column visibility)
     * - Optional: Export/Import CSV (when callbacks provided)
     */
    import type { GridApi } from '@ag-grid-community/core';
    import { isTagCategoryColumn } from '@gamescript/shared';
    import { ActionMenu, type ActionMenuItem } from '$lib/components/common';

    interface Props {
        /** AG-Grid API instance */
        api: GridApi | undefined;
        /** Whether this grid has tag columns (shows the toggle option) */
        hasTagColumns?: boolean;
        /** Optional callback for CSV export */
        onExportCsv?: () => void;
        /** Optional callback for CSV import */
        onImportCsv?: () => void;
    }

    let { api, hasTagColumns = false, onExportCsv, onImportCsv }: Props = $props();

    // Menu item IDs
    const MENU_CLEAR_FILTERS = 'clear-filters';
    const MENU_CLEAR_SORT = 'clear-sort';
    const MENU_SHOW_COLUMNS = 'show-columns';
    const MENU_SHOW_ALL_TAGS = 'show-all-tags';
    const MENU_HIDE_ALL_TAGS = 'hide-all-tags';
    const MENU_EXPORT_CSV = 'export-csv';
    const MENU_IMPORT_CSV = 'import-csv';

    // Build menu items dynamically based on provided callbacks
    const menuItems: ActionMenuItem[] = $derived.by(() => {
        const items: ActionMenuItem[] = [
            {
                type: 'button',
                id: MENU_CLEAR_FILTERS,
                label: 'Clear Filters',
            },
            {
                type: 'button',
                id: MENU_CLEAR_SORT,
                label: 'Clear Sort',
            },
            { type: 'separator' },
            {
                type: 'button',
                id: MENU_SHOW_COLUMNS,
                label: 'Show Columns...',
            },
        ];

        // Add tag columns show/hide options if grid has tag columns
        if (hasTagColumns) {
            items.push({
                type: 'button',
                id: MENU_SHOW_ALL_TAGS,
                label: 'Show All Tag Columns',
            });
            items.push({
                type: 'button',
                id: MENU_HIDE_ALL_TAGS,
                label: 'Hide All Tag Columns',
            });
        }

        // Add export/import options if callbacks are provided
        if (onExportCsv || onImportCsv) {
            items.push({ type: 'separator' });

            if (onExportCsv) {
                items.push({
                    type: 'button',
                    id: MENU_EXPORT_CSV,
                    label: 'Export as CSV...',
                });
            }

            if (onImportCsv) {
                items.push({
                    type: 'button',
                    id: MENU_IMPORT_CSV,
                    label: 'Import from CSV...',
                });
            }
        }

        return items;
    });

    function handleSelect(itemId: string): void {
        switch (itemId) {
            case MENU_CLEAR_FILTERS:
                api?.setFilterModel(null);
                break;
            case MENU_CLEAR_SORT:
                api?.applyColumnState({
                    defaultState: { sort: null },
                });
                break;
            case MENU_SHOW_COLUMNS:
                api?.showColumnChooser();
                break;
            case MENU_SHOW_ALL_TAGS:
            case MENU_HIDE_ALL_TAGS:
                // Find all tag columns by their ID pattern and set visibility
                const allColumns = api?.getColumns() ?? [];
                const tagColumnIds = allColumns
                    .map(col => col.getColId())
                    .filter(colId => isTagCategoryColumn(colId));
                if (tagColumnIds.length > 0) {
                    api?.setColumnsVisible(tagColumnIds, itemId === MENU_SHOW_ALL_TAGS);
                }
                break;
            case MENU_EXPORT_CSV:
                onExportCsv?.();
                break;
            case MENU_IMPORT_CSV:
                onImportCsv?.();
                break;
        }
    }
</script>

<ActionMenu items={menuItems} onselect={handleSelect}>
    Table Options
</ActionMenu>
