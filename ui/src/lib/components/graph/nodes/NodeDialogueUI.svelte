<script lang="ts">
    /**
     * UI response text display component for dialogue nodes.
     *
     * Shows the UI/choice text for a dialogue node (what players see as an option).
     * Uses RowColumnTextArea for inline editing support.
     *
     * Migrated to Svelte 5 ($props) but keeps $: for IDbRowView reactivity
     */
    import type { Localization } from '@gamescript/shared';
    import { localeIdToColumn } from '@gamescript/shared';
    import { RowColumnTextArea } from '$lib/components/common';
    import type { IDbRowView } from '$lib/db';
    import { localePrincipalTableView, getLocalePrincipal } from '$lib/tables/locale-principal.js';
    import {
        NODE_UNDO_UI_TEXT,
        NODE_PLACEHOLDER_UI_TEXT,
    } from '$lib/constants/settings.js';

    interface Props {
        localization: IDbRowView<Localization> | undefined;
        disabled?: boolean;
    }

    let { localization, disabled = false }: Props = $props();

    // Derive primary locale from the table view
    let primaryLocaleView = $derived(getLocalePrincipal(localePrincipalTableView.rows));
    let primaryLocale = $derived(primaryLocaleView ? primaryLocaleView.data : undefined);
    let localeColumn = $derived(primaryLocale ? localeIdToColumn(primaryLocale.principal) : '');
</script>

<div class="nodrag nopan node-text-ui">
    {#if primaryLocale && localization && localeColumn}
        <RowColumnTextArea
            rowView={localization}
            columnName={localeColumn}
            undoText={NODE_UNDO_UI_TEXT}
            placeholder={NODE_PLACEHOLDER_UI_TEXT}
            rows={1}
            {disabled}
        />
    {/if}
</div>

<style>
    .node-text-ui {
        height: 42px;
    }

    .node-text-ui :global(.row-column-textarea-wrapper) {
        height: 100%;
    }

    .node-text-ui :global(textarea) {
        border: none !important;
        height: 100% !important;
        min-height: unset !important;
        padding: 4px 8px !important;
        background-color: var(--gs-bg-secondary) !important;
        resize: none !important;
        border-radius: 0 !important;
    }
</style>
