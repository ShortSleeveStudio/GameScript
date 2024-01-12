<script lang="ts">
    import { TooltipIcon } from 'carbon-components-svelte';
    import { Information } from 'carbon-icons-svelte';

    export let title: string;
    export let tooltipText: string;
</script>

<sup class="sup-with-tooltip">
    {title}
    <TooltipIcon {tooltipText} icon={Information} />
</sup>

<style>
    .sup-with-tooltip {
        display: flex;
        gap: 5px;
        align-items: center;
    }
</style>
