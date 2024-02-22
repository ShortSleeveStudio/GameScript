<script lang="ts">
    import { dbConnected } from '@lib/stores/settings/settings';
    import { Column, Content, Grid, Row } from 'carbon-components-svelte';
    import BuildGame from './BuildGame.svelte';
    import BuildLocalization from './BuildLocalization.svelte';
</script>

<div class="build">
    <Content style="height: 100%">
        <Grid noGutter style="height: 100%">
            <Row style="height: 100%">
                <Column>
                    {#if $dbConnected}
                        <BuildGame />
                        <BuildLocalization />
                    {/if}
                </Column>
            </Row>
        </Grid>
    </Content>
</div>

<style>
    .build {
        height: 100%;
        width: 100%;
        min-width: calc(52px * 8);
    }
</style>
