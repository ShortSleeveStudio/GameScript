<script lang="ts">
    import { Column, Content, Grid, Row } from 'carbon-components-svelte';
    import ActorsTable from './ActorsTable.svelte';
    import { dbConnected } from '@lib/stores/settings/settings';
</script>

<div class="actors">
    <Content>
        <Grid noGutter>
            <Row>
                <Column>
                    {#if $dbConnected}
                        <ActorsTable />
                    {/if}
                </Column>
            </Row>
        </Grid>
    </Content>
</div>

<style>
    .actors {
        height: 100%;
        min-width: calc(52px * 8);
    }
</style>
