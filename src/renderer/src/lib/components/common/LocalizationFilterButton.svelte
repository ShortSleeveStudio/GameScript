<script lang="ts">
    import type { Conversation } from '@common/common-schema';
    import type { IDbRowView } from '@lib/api/db/db-view-row-interface';
    import { LAYOUT_ID_LOCALIZATION_EDITOR } from '@lib/constants/default-layout';
    import {
        EVENT_DOCK_SELECTION_REQUEST,
        type DockSelectionRequest,
        type GridFilterByParentRequest,
        EVENT_LF_FILTER_BY_PARENT,
    } from '@lib/constants/events';
    import { Button } from 'carbon-components-svelte';

    export let rowView: IDbRowView<Conversation>;

    function onClick(): void {
        // Filter Localization
        dispatchEvent(
            new CustomEvent(EVENT_LF_FILTER_BY_PARENT, {
                detail: <GridFilterByParentRequest>{ parent: rowView.id },
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
