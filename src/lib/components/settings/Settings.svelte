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
</div>

<style>
    .settings {
        height: 100%;
        min-width: calc(70px * 8);
    }
</style>
