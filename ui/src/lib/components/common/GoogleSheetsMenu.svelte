<script lang="ts">
    /**
     * Google Sheets Menu component for the Localization Editor.
     *
     * Provides an ActionMenu with Google Sheets operations:
     * - Open in Browser (view the selected spreadsheet)
     * - Push to Sheets (export localizations to spreadsheet)
     * - Pull from Sheets (import localizations from spreadsheet)
     *
     * Menu items are disabled based on configuration/auth state.
     */
    import { ActionMenu, type ActionMenuItem } from '$lib/components/common';
    import {
        googleSheetsReady,
        googleSheetsSpreadsheet,
    } from '$lib/stores';
    import { bridge } from '$lib/api/bridge.js';

    interface Props {
        /** Whether a push operation is in progress */
        pushLoading?: boolean;
        /** Whether a pull operation is in progress */
        pullLoading?: boolean;
        /** Callback for push operation */
        onPush?: () => void;
        /** Callback for pull operation */
        onPull?: () => void;
    }

    let { pushLoading = false, pullLoading = false, onPush, onPull }: Props = $props();

    // Menu item IDs
    const MENU_OPEN_BROWSER = 'open-browser';
    const MENU_PUSH = 'push';
    const MENU_PULL = 'pull';

    // Derived state
    let hasSpreadsheet = $derived($googleSheetsSpreadsheet !== null);
    let isReady = $derived($googleSheetsReady);
    let isLoading = $derived(pushLoading || pullLoading);

    // Build menu items dynamically based on state
    const menuItems: ActionMenuItem[] = $derived.by(() => {
        const items: ActionMenuItem[] = [
            {
                type: 'button',
                id: MENU_OPEN_BROWSER,
                label: 'Open in Browser',
                disabled: !hasSpreadsheet,
            },
            { type: 'separator' },
            {
                type: 'button',
                id: MENU_PUSH,
                label: pushLoading ? 'Exporting...' : 'Export to Sheets',
                disabled: !isReady || isLoading,
                warning: 'Overwrites all data in the spreadsheet',
            },
            {
                type: 'button',
                id: MENU_PULL,
                label: pullLoading ? 'Importing...' : 'Import from Sheets',
                disabled: !isReady || isLoading,
            },
        ];

        return items;
    });

    // Tooltip for the menu button when not configured
    let menuTooltip = $derived.by(() => {
        if (!isReady) {
            return 'Configure Google Sheets in Settings to enable';
        }
        return $googleSheetsSpreadsheet?.name ?? 'Google Sheets';
    });

    function handleSelect(itemId: string): void {
        switch (itemId) {
            case MENU_OPEN_BROWSER:
                if ($googleSheetsSpreadsheet?.url) {
                    bridge.openExternal($googleSheetsSpreadsheet.url);
                }
                break;
            case MENU_PUSH:
                onPush?.();
                break;
            case MENU_PULL:
                onPull?.();
                break;
        }
    }
</script>

<ActionMenu items={menuItems} onselect={handleSelect} title={menuTooltip}>
    Google Sheets
</ActionMenu>
