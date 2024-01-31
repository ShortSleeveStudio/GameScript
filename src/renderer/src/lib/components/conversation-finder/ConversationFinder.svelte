<script lang="ts">
    import { Content, Grid, Column, Row } from 'carbon-components-svelte';
    import {} from 'carbon-components-svelte';
    import ConversationFinderGrid from './ConversationFinderGrid.svelte';
    import { dbConnected } from '@lib/stores/settings/settings';
</script>

<div class="conversation-finder">
    <Content style="height: 100%">
        <Grid noGutter style="height: 100%">
            <Row style="height: 100%">
                <Column style="height: 100%">
                    {#if $dbConnected}
                        <ConversationFinderGrid />
                    {/if}
                </Column>
            </Row>
        </Grid>
    </Content>
</div>

<style>
    .conversation-finder {
        height: 100%;
        /* min-width: calc(60px * 8); */
    }
</style>
