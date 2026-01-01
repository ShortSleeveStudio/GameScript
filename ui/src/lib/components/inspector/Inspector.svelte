<script lang="ts">
    /**
     * Inspector panel - displays properties of the currently selected item.
     *
     * Monitors the FocusManager and displays the appropriate editor based on
     * what type of item is selected. Uses IDbRowView for reactive data binding.
     *
     * Ported from GameScriptElectron.
     */
    import type {
        Row,
        Actor,
        Conversation,
        Node,
        Edge,
        Locale,
        Localization,
        Filter,
    } from '@gamescript/shared';
    import {
        type Focus,
        focusManager,
        type ActionUnsubscriber,
        type FocusPayloadActor,
        type FocusPayloadLocale,
        type FocusPayloadFilter,
    } from '$lib/stores/focus.js';
    import { onDestroy } from 'svelte';
    import { dbConnected } from '$lib/stores/connection.js';
    import {
        query,
        DATABASE_TABLES,
        TABLE_CONVERSATIONS,
        TABLE_NODES,
        TABLE_EDGES,
        TABLE_ACTORS,
        TABLE_LOCALES,
        TABLE_LOCALIZATIONS,
        TABLE_FILTERS,
        type IDbTableView,
        type IDbRowView,
    } from '$lib/db';
    import InspectorNode from './InspectorNode.svelte';
    import InspectorEdge from './InspectorEdge.svelte';
    import InspectorConversation from './InspectorConversation.svelte';
    import InspectorActor from './InspectorActor.svelte';
    import InspectorLocale from './InspectorLocale.svelte';
    import InspectorLocalization from './InspectorLocalization.svelte';
    import InspectorFilter from './InspectorFilter.svelte';
    import { common } from '$lib/crud';

    let focusedItems = $state(0);
    let inspectedFocus = $state<Focus | undefined>(undefined);
    let inspectedTableId = $state<number | undefined>(undefined);
    let inspectedTableView = $state<IDbTableView<Row> | undefined>(undefined);
    let focusUnsubscriber: ActionUnsubscriber;

    function onFocusChanged(): void {
        // Find new focus
        focusedItems = 0;
        let focused: Focus | undefined;
        let tableId: number | undefined;
        const focus: readonly Map<number, Focus>[] = focusManager.get();

        for (let i = 0; i < focus.length; i++) {
            const focusMap: Map<number, Focus> = focus[i];
            focusedItems += focusMap.size;
            if (focusMap.size === 1) {
                tableId = i;
                focused = focusMap.values().next().value;
            }
        }

        // Clear inspector if necessary
        if (
            focusedItems !== 1 ||
            tableId !== inspectedTableId ||
            (focused && inspectedFocus && focused.rowId !== inspectedFocus.rowId)
        ) {
            clearInspector();
        }

        if (focusedItems === 1 && focused !== undefined && tableId !== undefined) {
            // Exit early if we're already focused on the same thing
            if (
                inspectedFocus &&
                tableId === inspectedTableId &&
                focused.rowId === inspectedFocus.rowId
            ) {
                return;
            }

            // Load new table if needed
            inspectedFocus = focused;
            inspectedTableId = tableId;
            const tableRef = DATABASE_TABLES[inspectedTableId];
            inspectedTableView = common.fetchTable(
                tableRef,
                query<Row>().where('id').eq(inspectedFocus.rowId).build(),
            );
        }
    }

    function clearInspector(): void {
        if (inspectedTableView) common.releaseTable(inspectedTableView);
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

<div class="inspector">
    {#if $dbConnected && focusedItems}
        {#if focusedItems === 1 && inspectedTableView !== undefined && inspectedTableId !== undefined && inspectedFocus !== undefined}
            {#each inspectedTableView.rows as rowView (rowView.id)}
                {#if inspectedTableId === TABLE_ACTORS.id}
                    <InspectorActor rowView={rowView as IDbRowView<Actor>} payload={inspectedFocus.payload as FocusPayloadActor | undefined} />
                {:else if inspectedTableId === TABLE_CONVERSATIONS.id}
                    <InspectorConversation rowView={rowView as IDbRowView<Conversation>} />
                {:else if inspectedTableId === TABLE_NODES.id}
                    <InspectorNode rowView={rowView as IDbRowView<Node>} />
                {:else if inspectedTableId === TABLE_EDGES.id}
                    <InspectorEdge rowView={rowView as IDbRowView<Edge>} />
                {:else if inspectedTableId === TABLE_LOCALES.id}
                    <InspectorLocale rowView={rowView as IDbRowView<Locale>} payload={inspectedFocus.payload as FocusPayloadLocale | undefined} />
                {:else if inspectedTableId === TABLE_LOCALIZATIONS.id}
                    <InspectorLocalization
                        rowView={rowView as IDbRowView<Localization>}
                        showTitle={true}
                        showAccordion={false}
                        showConversationButton={true}
                        showLocalizationButton={false}
                    />
                {:else if inspectedTableId === TABLE_FILTERS.id}
                    <InspectorFilter rowView={rowView as IDbRowView<Filter>} payload={inspectedFocus.payload as FocusPayloadFilter | undefined} />
                {/if}
            {/each}
        {:else if focusedItems > 1}
            <div class="inspector-multi">
                {focusedItems} elements selected
            </div>
        {/if}
    {:else}
        <div class="inspector-empty">
            <span class="empty-text">Select an item to inspect</span>
        </div>
    {/if}
</div>

<style>
    .inspector {
        height: 100%;
        display: flex;
        flex-direction: column;
        background: var(--gs-bg-primary);
        color: var(--gs-fg-primary);
        font-size: var(--gs-font-size);
        padding: 1rem;
        overflow-y: auto;
    }

    .inspector-empty,
    .inspector-multi {
        display: flex;
        align-items: center;
        justify-content: center;
        height: 100%;
        color: var(--gs-fg-secondary);
    }

    .empty-text {
        font-style: italic;
    }
</style>
