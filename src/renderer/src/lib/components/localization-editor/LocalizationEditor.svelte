<script lang="ts">
    import { Content, Grid, Column, Row } from 'carbon-components-svelte';
    import {} from 'carbon-components-svelte';
    import { dbConnected } from '@lib/stores/settings/settings';
    import LocalizationEditorGrid from './LocalizationEditorGrid.svelte';
</script>

<div class="localization-editor">
    <Content style="height: 100%">
        <Grid noGutter style="height: 100%">
            <Row style="height: 100%">
                <Column>
                    {#if $dbConnected}
                        <LocalizationEditorGrid />
                    {/if}
                </Column>
            </Row>
        </Grid>
    </Content>
</div>

<style>
    .localization-editor {
        height: 100%;
        /* min-width: calc(60px * 8); */
    }
</style>
