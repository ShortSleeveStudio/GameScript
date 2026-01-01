<script lang="ts">
    /**
     * Inspector panel for Conversation rows.
     *
     * Displays editable fields for conversation name and notes.
     * Ported from GameScriptElectron.
     */
    import type { Conversation } from '@gamescript/shared';
    import type { IDbRowView } from '$lib/db';
    import {
        RowColumnId,
        RowColumnInput,
        RowColumnTextArea,
        InspectorField,
    } from '$lib/components/common';
    import LocalizationFilterButton from '$lib/components/common/LocalizationFilterButton.svelte';
    import {
        CONVERSATION_PLACEHOLDER_NAME,
        CONVERSATION_PLACEHOLDER_NOTES,
        CONVERSATION_UNDO_NAME,
        CONVERSATION_UNDO_NOTES,
    } from '$lib/constants/settings';

    interface Props {
        rowView: IDbRowView<Conversation>;
    }

    let { rowView }: Props = $props();
</script>

<h2>Conversation</h2>

<InspectorField label="ID">
    <RowColumnId {rowView} />
</InspectorField>

<InspectorField label="Name">
    <RowColumnInput
        {rowView}
        columnName={'name'}
        undoText={CONVERSATION_UNDO_NAME}
        inputPlaceholder={CONVERSATION_PLACEHOLDER_NAME}
    />
</InspectorField>

<InspectorField label="Notes">
    <RowColumnTextArea
        {rowView}
        undoText={CONVERSATION_UNDO_NOTES}
        columnName={'notes'}
        placeholder={CONVERSATION_PLACEHOLDER_NOTES}
    />
</InspectorField>

<InspectorField label="Localizations">
    <LocalizationFilterButton {rowView} />
</InspectorField>

<style>
    h2 {
        margin: 0 0 1rem 0;
        font-size: 1.125rem;
        font-weight: 600;
        color: var(--gs-fg-primary);
    }
</style>
