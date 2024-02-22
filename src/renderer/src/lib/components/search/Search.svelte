<script lang="ts">
    import { dbConnected } from '@lib/stores/settings/settings';
    import { Column, Content, Grid, Row } from 'carbon-components-svelte';
    import SearchTable from './SearchTable.svelte';
</script>

<div class="search">
    <Content style="height: 100%">
        <Grid noGutter style="height: 100%">
            <Row style="height: 100%">
                <Column>
                    {#if $dbConnected}
                        <SearchTable />
                    {/if}
                </Column>
            </Row>
        </Grid>
    </Content>
</div>

<style>
    .search {
        height: 100%;
        width: 100%;
        min-width: calc(52px * 8);
    }
</style>
