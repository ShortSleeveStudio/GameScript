<script lang="ts">
    import { dbConnected } from '@lib/stores/settings/settings';
    import { Column, Content, Grid, Row } from 'carbon-components-svelte';
    import SearchTable from './SearchTable.svelte';
</script>

<div class="search">
    <Content>
        <Grid noGutter>
            <Row>
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
        min-width: calc(52px * 8);
    }
</style>
