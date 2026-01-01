<script lang="ts">
    /**
     * Voice text display component for dialogue nodes.
     *
     * Shows the voice/spoken text for a dialogue node using the primary locale.
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
        NODE_UNDO_VOICE_TEXT,
        NODE_PLACEHOLDER_VOICE_TEXT,
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

<div class="nodrag nopan node-text-voice">
    {#if primaryLocale && localization && localeColumn}
        <RowColumnTextArea
            rowView={localization}
            columnName={localeColumn}
            undoText={NODE_UNDO_VOICE_TEXT}
            placeholder={NODE_PLACEHOLDER_VOICE_TEXT}
            {disabled}
        />
    {/if}
</div>

<style>
    .node-text-voice {
        height: 80px;
    }

    .node-text-voice :global(.row-column-textarea-wrapper) {
        height: 100%;
    }

    .node-text-voice :global(textarea) {
        border: none !important;
        height: 100% !important;
        min-height: unset !important;
        padding: 4px 8px !important;
        resize: none !important;
        border-radius: 0 !important;
    }
</style>
