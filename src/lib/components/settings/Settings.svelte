<script lang="ts">
    import { dbConnected } from '@lib/stores/settings/settings';
    import { Content } from 'carbon-components-svelte';

    import DatabaseSettings from './SettingsDatabase.svelte';
    import ConversationEditorSettings from './SettingsConversationEditor.svelte';
</script>

<div class="settings">
    <Content>
        <h3>Database</h3>
        <DatabaseSettings />
        {#if $dbConnected}
            <h3>Conversation Editor</h3>
            <ConversationEditorSettings />
            <h3>Coding</h3>

            <h3>Actors</h3>
        {/if}
    </Content>

    <!-- <Accordion size="sm">
        <AccordionItem title="Database" bind:open={$settingsDbOpen}></AccordionItem>
        <AccordionItem title="Conversation Editor" bind:open={$settingsConversationsOpen}
        ></AccordionItem>
        <AccordionItem title="Coding" bind:open={$settingsCodingOpen}
            >coding settings here</AccordionItem
        >
        <AccordionItem title="Actors" bind:open={$settingsActorsOpen}
            >actor settings here</AccordionItem
        >
    </Accordion> -->
</div>

<style>
    .settings {
        height: 100%;
        overflow-y: auto;
        /* overflow-y: scroll; */
        /* overflow-x: hidden; */
    }
</style>
