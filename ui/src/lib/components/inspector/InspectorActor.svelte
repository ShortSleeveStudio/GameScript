<script lang="ts">
    /**
     * Inspector panel for Actor rows.
     *
     * Displays editable fields for actor name (with unique validation),
     * color, and localized name.
     *
     * Ported from GameScriptElectron.
     */
    import { ACTOR_GENDERS, type Actor } from '@gamescript/shared';
    import type { IDbRowView } from '$lib/db';
    import type { FocusPayloadActor } from '$lib/stores/focus.js';
    import { IsLoadingStore } from '$lib/stores/is-loading.js';
    import { common } from '$lib/crud';
    import {
        RowColumnId,
        RowColumnColor,
        RowColumnTextArea,
        InspectorField,
        Dropdown,
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

    const isLoading = new IsLoadingStore();

    // Gender dropdown options
    const genderOptions = ACTOR_GENDERS.map(g => ({
        value: g,
        label: g.charAt(0).toUpperCase() + g.slice(1),
    }));

    let currentGender = $derived(rowView.data.grammatical_gender);

    async function onGenderChange(value: string | number): Promise<void> {
        if (typeof value !== 'string') return;
        if (value === currentGender) return;

        const oldRow = { ...rowView.getValue() };
        const newRow = { ...oldRow, grammatical_gender: value };
        await isLoading.wrapPromise(
            common.updateOne(rowView.tableType, oldRow, newRow, 'actor gender change')
        );
    }
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

<InspectorField
    label="Grammatical Gender"
    tooltip="The grammatical gender of this actor. Used for selecting gender-specific text variants. 'Dynamic' means the game determines the gender at runtime (e.g., player character)."
>
    <Dropdown
        options={genderOptions}
        value={currentGender}
        disabled={$isLoading}
        onchange={onGenderChange}
        size="small"
    />
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
    <RowColumnLocalization {rowView} columnName={'localized_name'} showFormMatrix={false} />
</InspectorField>

<style>
    h2 {
        margin: 0 0 1rem 0;
        font-size: 1.125rem;
        font-weight: 600;
        color: var(--gs-fg-primary);
    }
</style>
