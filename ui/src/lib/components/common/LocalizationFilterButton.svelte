<script lang="ts">
    /**
     * Button to filter the Localization Editor by conversation.
     *
     * Dispatches events to:
     * 1. Filter the localization editor grid by parent conversation
     * 2. Select/focus the localization editor panel
     *
     * Ported from GameScriptElectron.
     */
    import type { Conversation } from '@gamescript/shared';
    import type { IDbRowView } from '$lib/db';
    import { LAYOUT_ID_LOCALIZATION_EDITOR } from '$lib/constants/default-layout';
    import {
        requestDockSelection,
        filterLocalizationsByParent,
    } from '$lib/constants/events';
    import Button from './Button.svelte';

    export let rowView: IDbRowView<Conversation>;

    function onClick(): void {
        // Filter localization editor by this conversation's ID
        filterLocalizationsByParent(rowView.id);

        // Select/focus the localization editor panel
        requestDockSelection(LAYOUT_ID_LOCALIZATION_EDITOR);
    }
</script>

<Button variant="ghost" size="small" onclick={onClick}>
    View Localizations
</Button>
