<script lang="ts">
    /**
     * Table Options Menu component for AG-Grid panels.
     *
     * Provides a consistent ActionMenu with common grid operations:
     * - Clear Filters
     * - Clear Sort
     * - Show Columns (opens AG-Grid's column chooser)
     * - Optional: Export/Import CSV (when callbacks provided)
     */
    import type { GridApi } from '@ag-grid-community/core';
    import { ActionMenu, type ActionMenuItem } from '$lib/components/common';

    interface Props {
        /** AG-Grid API instance */
        api: GridApi | undefined;
        /** Optional callback for CSV export */
        onExportCsv?: () => void;
        /** Optional callback for CSV import */
        onImportCsv?: () => void;
    }

    let { api, onExportCsv, onImportCsv }: Props = $props();

    // Menu item IDs
    const MENU_CLEAR_FILTERS = 'clear-filters';
    const MENU_CLEAR_SORT = 'clear-sort';
    const MENU_SHOW_COLUMNS = 'show-columns';
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
