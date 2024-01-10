<script lang="ts">
    import { Column, Content, Grid, Row } from 'carbon-components-svelte';
    import ActorsTable from './ActorsTable.svelte';
</script>

<div class="actors">
    <Content>
        <Grid noGutter>
            <Row>
                <Column>
                    <ActorsTable />
                </Column>
            </Row>
        </Grid>
    </Content>
</div>

<style>
    .actors {
        height: 100%;
        min-width: calc(70px * 8);
    }
</style>
