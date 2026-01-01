<script lang="ts">
    /**
     * Localized text area for a specific locale.
     *
     * Wraps RowColumnTextArea to edit a specific locale column
     * on a localization row. Uses the locale's name as the label.
     *
     * Ported from GameScriptElectron.
     */
    import type { Localization, Locale } from '@gamescript/shared';
    import { localeIdToColumn } from '@gamescript/shared';
    import type { IDbRowView } from '$lib/db';
    import RowColumnTextArea from './RowColumnTextArea.svelte';
    import {
        LOCALIZATION_PLACEHOLDER_TEXT,
        LOCALIZATION_UNDO_TEXT,
    } from '$lib/constants/settings.js';

    interface Props {
        rowView: IDbRowView<Localization>;
        locale: IDbRowView<Locale>;
    }

    let { rowView, locale }: Props = $props();
</script>

{#if locale}
    <RowColumnTextArea
        {rowView}
        labelText={locale.data.name}
        columnName={localeIdToColumn(locale.data.id)}
        undoText={LOCALIZATION_UNDO_TEXT}
        placeholder={LOCALIZATION_PLACEHOLDER_TEXT}
    />
{/if}
