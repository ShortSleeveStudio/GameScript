<script lang="ts">
    /**
     * Inspector panel for Locale rows.
     *
     * Displays editable fields for locale name, primary selection,
     * and localized name.
     *
     * Ported from GameScriptElectron.
     */
    import type { Locale } from '@gamescript/shared';
    import type { IDbRowView } from '$lib/db';
    import type { FocusPayloadLocale } from '$lib/stores/focus.js';
    import { RowColumnId, InspectorField } from '$lib/components/common';
    import RowNameInput from '$lib/components/common/RowNameInput.svelte';
    import RowColumnRadio from '$lib/components/common/RowColumnRadio.svelte';
    import RowColumnLocalization from '$lib/components/common/RowColumnLocalization.svelte';
    import {
        LOCALE_UNDO_NAME,
        LOCALE_PLACEHOLDER_NAME,
        LOCALE_UNDO_PRIMARY,
    } from '$lib/constants/settings';

    interface Props {
        rowView: IDbRowView<Locale>;
        payload?: FocusPayloadLocale | undefined;
    }

    let { rowView, payload = undefined }: Props = $props();
</script>

<h2>Locale</h2>

<InspectorField label="ID">
    <RowColumnId {rowView} />
</InspectorField>

<InspectorField label="Name">
    <RowNameInput
        {rowView}
        undoText={LOCALE_UNDO_NAME}
        inputPlaceholder={LOCALE_PLACEHOLDER_NAME}
        uniqueNameTracker={payload?.uniqueNameTracker}
        isInspectorField={true}
    />
</InspectorField>

<InspectorField label="Primary">
    <RowColumnRadio
        {rowView}
        undoText={LOCALE_UNDO_PRIMARY}
        principalStore={payload?.localePrincipalRowView}
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
