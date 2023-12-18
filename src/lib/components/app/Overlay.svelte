<script lang="ts">
    import Toaster from '@lib/components/app/Toaster.svelte';
</script>

<div class="overlay-container">
    <Toaster />
</div>

<!-- TODO: https://github.com/carbon-design-system/carbon-components-svelte/issues/1629  -->

<style>
    .overlay-container {
        display: grid;
        pointer-events: none;
        z-index: var(--z-index-overlay);
        top: var(--cds-spacing-09);
        position: fixed;
        width: 100%;
        height: calc(100% - var(--cds-spacing-09));
    }
</style>
