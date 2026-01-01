<script lang="ts">
    /**
     * Inspector panel for Actor rows.
     *
     * Displays editable fields for actor name (with unique validation),
     * color, and localized name.
     *
     * Ported from GameScriptElectron.
     */
    import type { Actor } from '@gamescript/shared';
    import type { IDbRowView } from '$lib/db';
    import type { FocusPayloadActor } from '$lib/stores/focus.js';
    import {
        RowColumnId,
        RowColumnColor,
        RowColumnTextArea,
        InspectorField,
    } from '$lib/components/common';
    import RowNameInput from '$lib/components/common/RowNameInput.svelte';
    import RowColumnLocalization from '$lib/components/common/RowColumnLocalization.svelte';
    import {
        ACTORS_UNDO_NAME,
        ACTORS_PLACEHOLDER_NAME,
        ACTORS_UNDO_COLOR,
        ACTORS_UNDO_NOTES,
        ACTORS_PLACEHOLDER_NOTES,
    } from '$lib/constants/settings';

    interface Props {
        rowView: IDbRowView<Actor>;
        payload?: FocusPayloadActor | undefined;
    }

    let { rowView, payload = undefined }: Props = $props();
</script>

<h2>Actor</h2>

<InspectorField label="ID">
    <RowColumnId {rowView} />
</InspectorField>

<InspectorField label="Name">
    <RowNameInput
        {rowView}
        undoText={ACTORS_UNDO_NAME}
        inputPlaceholder={ACTORS_PLACEHOLDER_NAME}
        uniqueNameTracker={payload?.uniqueNameTracker}
        isInspectorField={true}
    />
</InspectorField>

<InspectorField label="Node Color">
    <RowColumnColor {rowView} columnName={'color'} undoText={ACTORS_UNDO_COLOR} />
</InspectorField>

<InspectorField label="Notes">
    <RowColumnTextArea
        {rowView}
        columnName={'notes'}
        undoText={ACTORS_UNDO_NOTES}
        placeholder={ACTORS_PLACEHOLDER_NOTES}
    />
</InspectorField>

<InspectorField label="Localized Name">
    <RowColumnLocalization {rowView} columnName={'localized_name'} />
</InspectorField>

<style>
    h2 {
        margin: 0 0 1rem 0;
        font-size: 1.125rem;
        font-weight: 600;
        color: var(--gs-fg-primary);
    }
</style>
