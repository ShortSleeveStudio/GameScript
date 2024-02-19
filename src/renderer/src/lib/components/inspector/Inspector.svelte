<script lang="ts">
    import {
        TABLE_ID_ACTORS,
        TABLE_ID_AUTO_COMPLETES,
        TABLE_ID_CONVERSATIONS,
        TABLE_ID_EDGES,
        TABLE_ID_FILTERS,
        TABLE_ID_LOCALES,
        TABLE_ID_LOCALIZATIONS,
        TABLE_ID_NODES,
        TABLE_ID_ROUTINES,
    } from '@lib/api/db/db-schema';
    import { type Focus, focusManager } from '@lib/stores/app/focus';
    import { Column, Content, Grid, Row as CarbonRow } from 'carbon-components-svelte';
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

    let inspected: Focus;
    let focusedItems: number = 0;

    function onFocusChanged(): void {
        focusedItems = 0;
        inspected = undefined;
        const focus: readonly Map<number, Focus>[] = focusManager.get();
        for (let i = 0; i < focus.length; i++) {
            const focusMap: Map<number, Focus> = focus[i];
            focusedItems += focusMap.size;
            if (focusMap.size === 1) {
                inspected = focusMap.values().next().value;
            }
        }
        dispatchEvent(
            new CustomEvent(EVENT_DOCK_SELECTION_REQUEST, {
                detail: <DockSelectionRequest>{ layoutId: LAYOUT_ID_INSPECTOR },
            }),
        );
    }
    onDestroy(focusManager.subscribe(onFocusChanged));
</script>

<!-- https://svelte-5-preview.vercel.app/status -->
<!-- For all the casting that needs to be done -->
<div class="inspector">
    <Content>
        <Grid noGutter>
            <CarbonRow>
                <Column>
                    {#if $dbConnected && focusedItems}
                        <!-- Destroy and recreate anytime the focus changes -->
                        {#if focusedItems === 1}
                            {#if inspected.rowView.tableId === TABLE_ID_ROUTINES}
                                <InspectorRoutine
                                    rowView={inspected.rowView}
                                    payload={inspected.payload}
                                />
                            {:else if inspected.rowView.tableId === TABLE_ID_AUTO_COMPLETES}
                                <InspectorAutoComplete
                                    rowView={inspected.rowView}
                                    payload={inspected.payload}
                                />
                            {:else if inspected.rowView.tableId === TABLE_ID_ACTORS}
                                <InspectorActor
                                    rowView={inspected.rowView}
                                    payload={inspected.payload}
                                />
                            {:else if inspected.rowView.tableId === TABLE_ID_LOCALES}
                                <InspectorLocale
                                    rowView={inspected.rowView}
                                    payload={inspected.payload}
                                />
                            {:else if inspected.rowView.tableId === TABLE_ID_FILTERS}
                                <InspectorFilter
                                    rowView={inspected.rowView}
                                    payload={inspected.payload}
                                />
                            {:else if inspected.rowView.tableId === TABLE_ID_CONVERSATIONS}
                                <InspectorConversation rowView={inspected.rowView} />
                            {:else if inspected.rowView.tableId === TABLE_ID_LOCALIZATIONS}
                                <InspectorLocalization
                                    rowView={inspected.rowView}
                                    showTitle={true}
                                    showConversationButton={true}
                                />
                            {:else if inspected.rowView.tableId === TABLE_ID_NODES}
                                <InspectorNode rowView={inspected.rowView} />
                            {:else if inspected.rowView.tableId === TABLE_ID_EDGES}
                                <InspectorEdge rowView={inspected.rowView} />
                            {/if}
                        {:else if focusedItems > 1}
                            {focusedItems} elements selected
                        {/if}
                    {/if}
                </Column>
            </CarbonRow>
        </Grid>
    </Content>
</div>

<style>
    .inspector {
        /* Textareas don't get any smaller also, tooltips don't either */
        height: 100%;
        min-width: calc(45 * 8px);
    }
</style>
