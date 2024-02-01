<script lang="ts">
    import type { Conversation } from '@lib/api/db/db-schema';
    import type { IDbRowView } from '@lib/api/db/db-view-row-interface';
    import { LAYOUT_ID_LOCALIZATION_EDITOR } from '@lib/constants/default-layout';
    import {
        EVENT_DOCK_SELECTION_REQUEST,
        EVENT_LOCALIZATIONS_FILTER_BY_PARENT,
        type DockSelectionRequest,
        type LocalizationsFilterByParent,
    } from '@lib/constants/events';
    import { Button } from 'carbon-components-svelte';

    export let rowView: IDbRowView<Conversation>;

    function onClick(): void {
        // Filter Localization
        dispatchEvent(
            new CustomEvent(EVENT_LOCALIZATIONS_FILTER_BY_PARENT, {
                detail: <LocalizationsFilterByParent>{ parent: rowView.id },
            }),
        );

        // Select Localization Editor
        dispatchEvent(
            new CustomEvent(EVENT_DOCK_SELECTION_REQUEST, {
                detail: <DockSelectionRequest>{ layoutId: LAYOUT_ID_LOCALIZATION_EDITOR },
            }),
        );
    }
</script>

<div>
    <Button size="small" on:click={onClick}>View Localizations</Button>
</div>
