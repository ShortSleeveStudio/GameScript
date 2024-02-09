<script lang="ts">
    import { Tile } from 'carbon-components-svelte';

    export let title: string = '';
    export let header: string = '';
</script>

<div class="container">
    <Tile style="margin-bottom: 0px;">
        {#if title}
            <h4 class="container-title">{title}</h4>
        {/if}
        {#if header}
            <p class="container-header">
                {header}
            </p>
        {/if}
    </Tile>
    {#if $$slots.toolbar}
        <div class="container-toolbar">
            <slot name="toolbar" />
        </div>
    {/if}
    {#if $$slots.widget}
        <div class="container-widget">
            <slot name="widget" />
        </div>
    {/if}
</div>

<style>
    .container {
        display: flex;
        flex-direction: column;
        height: 100%;
        justify-content: flex-start;
        align-items: stretch;
    }
    .container > * {
        flex-grow: 1;
    }
    .container-title {
        font-size: var(--cds-productive-heading-03-font-size, 1.25rem);
        font-weight: var(--cds-productive-heading-03-font-weight, 400);
        line-height: var(--cds-productive-heading-03-line-height, 1.4);
        letter-spacing: var(--cds-productive-heading-03-letter-spacing, 0);
        color: var(--cds-text-primary, #161616);
    }
    .container-header {
        font-size: var(--cds-body-short-01-font-size, 0.875rem);
        font-weight: var(--cds-body-short-01-font-weight, 400);
        line-height: var(--cds-body-short-01-line-height, 1.28572);
        letter-spacing: var(--cds-body-short-01-letter-spacing, 0.16px);
        color: var(--cds-text-secondary, #525252);
        margin-bottom: 0px;
    }
    .container-toolbar {
        display: flex;
        justify-content: flex-end;
        height: 2rem;
        flex-grow: 0;
        background-color: var(--cds-ui-01, #f4f4f4);
    }
    .container-widget {
        flex-grow: 1;
    }
</style>
