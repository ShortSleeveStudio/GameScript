<script lang="ts">
    import { dbConnected } from '@lib/stores/settings/settings';
    import { Content, Grid } from 'carbon-components-svelte';

    import SettingsDatabase from './SettingsDatabase.svelte';
    import SettingsConversationEditor from './SettingsConversationEditor.svelte';
    import SettingsCoding from './SettingsCoding.svelte';
    import SettingsActors from './SettingsActors.svelte';
</script>

<div class="settings">
    <Content>
        <Grid noGutter>
            <SettingsDatabase />
            {#if $dbConnected}
                <SettingsConversationEditor />
                <!-- {#if $defaultFieldsDialogue.length === 1} -->
                <!-- <SettingsConversationEditor defaultFieldsNode={$defaultFieldsDialogue[0]} /> -->
                <!-- {/if} -->
                <SettingsCoding />
                <SettingsActors />
            {/if}
        </Grid>
    </Content>
</div>

<style>
    .settings {
        height: 100%;
        min-width: calc(70px * 8);
    }
</style>
