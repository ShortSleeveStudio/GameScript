<script lang="ts">
    import {
        TABLE_ID_ACTORS,
        TABLE_ID_AUTO_COMPLETES,
        TABLE_ID_CONVERSATIONS,
        TABLE_ID_FILTERS,
        TABLE_ID_LOCALES,
        TABLE_ID_LOCALIZATIONS,
        TABLE_ID_ROUTINES,
    } from '@lib/api/db/db-schema';
    import { focused, type Focusable } from '@lib/stores/app/focus';
    import { Column, Content, Grid, Row } from 'carbon-components-svelte';
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

    let inspected: Focusable;

    function onFocusChanged(focus: Focusable): void {
        inspected = focus;
        dispatchEvent(
            new CustomEvent(EVENT_DOCK_SELECTION_REQUEST, {
                detail: <DockSelectionRequest>{ layoutId: LAYOUT_ID_INSPECTOR },
            }),
        );
    }

    onDestroy(focused.subscribe(onFocusChanged));
</script>

<!-- https://svelte-5-preview.vercel.app/status -->
<!-- For all the casting that needs to be done -->
<div class="inspector">
    <Content>
        <Grid noGutter>
            <Row>
                <Column>
                    {#if $dbConnected && inspected}
                        <!-- Destroy and recreate anytime the focus changes -->
                        {#key inspected}
                            {#if inspected.tableId === TABLE_ID_ROUTINES}
                                <InspectorRoutine
                                    rowView={inspected.rowView}
                                    payload={inspected.payload}
                                />
                            {:else if inspected.tableId === TABLE_ID_AUTO_COMPLETES}
                                <InspectorAutoComplete
                                    rowView={inspected.rowView}
                                    payload={inspected.payload}
                                />
                            {:else if inspected.tableId === TABLE_ID_ACTORS}
                                <InspectorActor
                                    rowView={inspected.rowView}
                                    payload={inspected.payload}
                                />
                            {:else if inspected.tableId === TABLE_ID_LOCALES}
                                <InspectorLocale
                                    rowView={inspected.rowView}
                                    payload={inspected.payload}
                                />
                            {:else if inspected.tableId === TABLE_ID_FILTERS}
                                <InspectorFilter
                                    rowView={inspected.rowView}
                                    payload={inspected.payload}
                                />
                            {:else if inspected.tableId === TABLE_ID_CONVERSATIONS}
                                <InspectorConversation rowView={inspected.rowView} />
                            {:else if inspected.tableId === TABLE_ID_LOCALIZATIONS}
                                <InspectorLocalization
                                    rowView={inspected.rowView}
                                    showTitle={true}
                                />
                            {/if}
                        {/key}
                    {/if}
                </Column>
            </Row>
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
