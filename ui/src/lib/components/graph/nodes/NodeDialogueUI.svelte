<script lang="ts">
    /**
     * UI response text display component for dialogue nodes.
     *
     * Shows the UI/choice text for a dialogue node using the primary locale,
     * with gender resolved from the localization's subject. Falls back to
     * x-source if no primary locale data exists for the resolved gender.
     */
    import type { Localization } from '@gamescript/shared';
    import { RowColumnTextArea } from '$lib/components/common';
    import type { IDbRowView } from '$lib/db';
    import { localePrincipalTableView, getLocalePrincipal } from '$lib/tables/locale-principal.js';
    import { systemCreatedLocaleTableView, getSystemCreatedLocale } from '$lib/tables/locale-system-created.js';
    import { actorsTable } from '$lib/tables/actors.js';
    import { resolvePreviewColumn } from '$lib/utils/localization-helpers.js';
    import {
        NODE_UNDO_UI_TEXT,
        NODE_PLACEHOLDER_UI_TEXT,
    } from '$lib/constants/settings.js';

    interface Props {
        localization: IDbRowView<Localization> | undefined;
        disabled?: boolean;
    }

    let { localization, disabled = false }: Props = $props();

    let primaryLocaleView = $derived(getLocalePrincipal(localePrincipalTableView.rows));
    let xSourceLocale = $derived(getSystemCreatedLocale(systemCreatedLocaleTableView.rows));

    let localeColumn = $derived.by((): string => {
        if (!primaryLocaleView || !xSourceLocale || !localization) return '';
        return resolvePreviewColumn(
            localization.data,
            primaryLocaleView.data.principal,
            xSourceLocale.data.id,
            actorsTable.rows,
        );
    });
</script>

<div class="nodrag nopan node-text-ui">
    {#if localeColumn && localization}
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
