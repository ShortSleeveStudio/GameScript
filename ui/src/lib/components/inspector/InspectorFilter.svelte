<script lang="ts">
    /**
     * Inspector panel for Filter rows.
     *
     * Displays editable fields for filter name and developer notes.
     *
     * Ported from GameScriptElectron.
     */
    import type { Filter } from '@gamescript/shared';
    import type { IDbRowView } from '$lib/db';
    import type { FocusPayloadFilter } from '$lib/stores/focus.js';
    import { RowColumnId, RowColumnTextArea, InspectorField } from '$lib/components/common';
    import RowNameInput from '$lib/components/common/RowNameInput.svelte';
    import {
        FILTER_UNDO_NAME,
        FILTER_PLACEHOLDER_NAME,
        FILTER_UNDO_NOTES,
        FILTER_PLACEHOLDER_NOTES,
    } from '$lib/constants/settings';

    interface Props {
        rowView: IDbRowView<Filter>;
        payload?: FocusPayloadFilter | undefined;
    }

    let { rowView, payload = undefined }: Props = $props();
</script>

<h2>Filter</h2>

<InspectorField label="ID">
    <RowColumnId {rowView} />
</InspectorField>

<InspectorField label="Name">
    <RowNameInput
        {rowView}
        undoText={FILTER_UNDO_NAME}
        inputPlaceholder={FILTER_PLACEHOLDER_NAME}
        uniqueNameTracker={payload?.uniqueNameTracker}
        isInspectorField={true}
    />
</InspectorField>

<InspectorField label="Notes">
    <RowColumnTextArea
        {rowView}
        undoText={FILTER_UNDO_NOTES}
        columnName={'notes'}
        placeholder={FILTER_PLACEHOLDER_NOTES}
    />
</InspectorField>

<style>
    h2 {
        margin: 0 0 1rem 0;
        font-size: 1.125rem;
        font-weight: 600;
        color: var(--gs-fg-primary);
    }
</style>
