<script>
    import {
        actorsOpen,
        conversationsOpen,
        dbOpen,
        scriptingOpen,
    } from '@lib/stores/settings/settings';
    import { Accordion, AccordionItem, Dropdown } from 'carbon-components-svelte';
</script>

<div class="settings">
    <Accordion size="xl">
        <AccordionItem title="Database" bind:open={$dbOpen}>
            <Dropdown
                size="sm"
                titleText="Select Backend"
                selectedId="0"
                items={[
                    { id: '0', text: 'Slack' },
                    { id: '1', text: 'Email' },
                    { id: '2', text: 'Fax' },
                ]}
            />
            <!-- <p>database stuff here</p> -->
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
