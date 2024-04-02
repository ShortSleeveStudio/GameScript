<script lang="ts">
    import { Content, Grid } from 'carbon-components-svelte';

    export let minWidth: number = 70 * 8;
</script>

<div class="dockable-content" style:min-width={minWidth + 'px'}>
    <Content style="height: 100%;">
        <Grid
            noGutter
            style="height: 100%; min-width: 100%; width: 100%; margin-left: 0; margin-right: 0;"
        >
            <slot />
        </Grid>
    </Content>
</div>

<style>
    .dockable-content {
        height: 100%;
        width: 100%;
    }
</style>
