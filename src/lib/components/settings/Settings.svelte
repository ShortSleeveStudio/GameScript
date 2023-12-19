<script lang="ts">
    import {
        actorsOpen,
        conversationsOpen,
        dbOpen,
        scriptingOpen,
    } from '@lib/stores/settings/settings';
    import { Accordion, AccordionItem } from 'carbon-components-svelte';

    import DatabaseSettings from './DatabaseSettings.svelte';
</script>

<div class="settings">
    <Accordion size="sm">
        <AccordionItem title="Database" bind:open={$dbOpen}>
            <DatabaseSettings />
        </AccordionItem>
        <AccordionItem title="Conversation Editor" bind:open={$conversationsOpen}
            >conversation editor settings</AccordionItem
        >
        <AccordionItem title="Scripting" bind:open={$scriptingOpen}
            >scripting settings here</AccordionItem
        >
        <AccordionItem title="Actors" bind:open={$actorsOpen}>actor settings here</AccordionItem>
    </Accordion>
</div>

<style>
    .settings {
        height: 100%;
        overflow-y: auto;
        /* overflow-y: scroll; */
        /* overflow-x: hidden; */
    }
</style>
