<script lang="ts">
    import { type Row } from '@common/common-schema';
    import { type Focus, focusManager } from '@lib/stores/app/focus';
    import { onDestroy } from 'svelte';
    import InspectorRoutine from './InspectorRoutine.svelte';
    import { LAYOUT_ID_INSPECTOR } from '@lib/constants/default-layout';
    import { EVENT_DOCK_SELECTION_REQUEST, type DockSelectionRequest } from '@lib/constants/events';
    import InspectorAutoComplete from './InspectorAutoComplete.svelte';
    import InspectorActor from './InspectorActor.svelte';
    import InspectorLocale from './InspectorLocale.svelte';
    import InspectorFilter from './InspectorFilter.svelte';
    import { dbConnected } from '@lib/stores/settings/settings';
    import InspectorConversation from './InspectorConversation.svelte';
    import InspectorLocalization from './InspectorLocalization.svelte';
    import InspectorNode from './InspectorNode.svelte';
    import InspectorEdge from './InspectorEdge.svelte';
    import { db } from '@lib/api/db/db';
    import type { IDbTableView } from '@lib/api/db/db-view-table-interface';
    import { createFilter } from '@lib/api/db/db-filter';
    import type { Unsubscriber } from 'svelte/store';
    import DockableContent from '../app/DockableContent.svelte';
    import DockableRow from '../app/DockableRow.svelte';
    import DockableColumn from '../app/DockableColumn.svelte';
    import {
        DATABASE_TABLES,
        TABLE_ROUTINES,
        type DatabaseTableId,
        TABLE_AUTO_COMPLETES,
        TABLE_ACTORS,
        TABLE_LOCALES,
        TABLE_FILTERS,
        TABLE_CONVERSATIONS,
        TABLE_LOCALIZATIONS,
        TABLE_NODES,
        TABLE_EDGES,
    } from '@common/common-types';

    let focusedItems: number = 0;
    let inspectedFocus: Focus | undefined;
    let inspectedTableId: number | undefined;
    let inspectedTableView: IDbTableView<Row> | undefined;
    let focusUnsubscriber: Unsubscriber;

    function onFocusChanged(): void {
        // Find new focus
        focusedItems = 0;
        let focused: Focus;
        let tableId: DatabaseTableId;
        const focus: readonly Map<number, Focus>[] = focusManager.get();
        for (let i = 0; i < focus.length; i++) {
            const focusMap: Map<number, Focus> = focus[i];
            focusedItems += focusMap.size;
            if (focusMap.size === 1) {
                tableId = i;
                focused = <Focus>focusMap.values().next().value;
            }
        }

        // Clear inspector if necessary
        if (
            focusedItems !== 1 ||
            tableId !== inspectedTableId ||
            focused.rowId !== inspectedFocus.rowId
        ) {
            clearInspector();
        }

        if (focusedItems === 1) {
            // Exit early if we're already focused on the same thing
            if (
                focused &&
                inspectedFocus &&
                tableId === inspectedTableId &&
                focused.rowId === inspectedFocus.rowId
            ) {
                return;
            }

            // Load new table if needed
            inspectedFocus = focused;
            inspectedTableId = tableId;
            inspectedTableView = db.fetchTable(
                DATABASE_TABLES[inspectedTableId],
                createFilter().where().column('id').eq(inspectedFocus.rowId).endWhere().build(),
            );
        }

        // Request selection
        dispatchEvent(
            new CustomEvent(EVENT_DOCK_SELECTION_REQUEST, {
                detail: <DockSelectionRequest>{ layoutId: LAYOUT_ID_INSPECTOR },
            }),
        );
    }

    function clearInspector(): void {
        if (inspectedTableView) db.releaseTable(inspectedTableView);
        inspectedFocus = undefined;
        inspectedTableId = undefined;
        inspectedTableView = undefined;
    }

    focusUnsubscriber = focusManager.subscribe(onFocusChanged);
    onDestroy(() => {
        if (focusUnsubscriber) focusUnsubscriber();
        clearInspector();
    });
</script>

<!-- https://svelte-5-preview.vercel.app/status -->
<!-- For all the casting that needs to be done -->
<DockableContent minWidth={45 * 8}>
    <DockableRow>
        <DockableColumn>
            {#if $dbConnected && focusedItems}
                <!-- Destroy and recreate anytime the focus changes -->
                {#if focusedItems === 1 && inspectedTableView !== undefined && inspectedTableId !== undefined && inspectedFocus !== undefined}
                    {#each $inspectedTableView as rowView (rowView.id)}
                        {#if inspectedTableId === TABLE_ROUTINES.id}
                            <InspectorRoutine {rowView} payload={inspectedFocus.payload} />
                        {:else if inspectedTableId === TABLE_AUTO_COMPLETES.id}
                            <InspectorAutoComplete {rowView} payload={inspectedFocus.payload} />
                        {:else if inspectedTableId === TABLE_ACTORS.id}
                            <InspectorActor {rowView} payload={inspectedFocus.payload} />
                        {:else if inspectedTableId === TABLE_LOCALES.id}
                            <InspectorLocale {rowView} payload={inspectedFocus.payload} />
                        {:else if inspectedTableId === TABLE_FILTERS.id}
                            <InspectorFilter {rowView} payload={inspectedFocus.payload} />
                        {:else if inspectedTableId === TABLE_CONVERSATIONS.id}
                            <InspectorConversation {rowView} />
                        {:else if inspectedTableId === TABLE_LOCALIZATIONS.id}
                            <InspectorLocalization
                                {rowView}
                                showTitle={true}
                                showAccordion={false}
                                showConversationButton={true}
                                showLocalizationButton={false}
                            />
                        {:else if inspectedTableId === TABLE_NODES.id}
                            <InspectorNode {rowView} />
                        {:else if inspectedTableId === TABLE_EDGES.id}
                            <InspectorEdge {rowView} />
                        {/if}
                    {/each}
                {:else if focusedItems > 1}
                    {focusedItems} elements selected
                {/if}
            {/if}
        </DockableColumn>
    </DockableRow>
</DockableContent>
