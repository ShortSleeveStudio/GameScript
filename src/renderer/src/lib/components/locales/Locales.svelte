<script lang="ts">
    import { Column, Content, Grid, Row } from 'carbon-components-svelte';
    import LocalesTable from './LocalesTable.svelte';
</script>

<div class="locales">
    <Content>
        <Grid noGutter>
            <Row>
                <Column>
                    <LocalesTable />
                </Column>
            </Row>
        </Grid>
    </Content>
</div>

<style>
    .locales {
        height: 100%;
        min-width: calc(70px * 8);
    }
</style>
