<script lang="ts">
    import { Content, Grid, Column, Row } from 'carbon-components-svelte';
    import {} from 'carbon-components-svelte';
    import { dbConnected } from '@lib/stores/settings/settings';
    import ConversationEditorGraph from './ConversationEditorGraph.svelte';
    import { SvelteFlowProvider } from '@xyflow/svelte';
    // import { SvelteFlowProvider } from '@lib/vendor/flow/svelte/src/lib';
</script>

<div class="conversation-editor">
    <Content style="height: 100%">
        <Grid noGutter style="height: 100%">
            <Row style="height: 100%">
                <Column>
                    {#if $dbConnected}
                        <SvelteFlowProvider>
                            <ConversationEditorGraph />
                        </SvelteFlowProvider>
                    {/if}
                </Column>
            </Row>
        </Grid>
    </Content>
</div>

<style>
    .conversation-editor {
        height: 100%;
        width: 100%;
        /* min-width: calc(52px * 8); */
    }
</style>
