<script lang="ts">
    import { dbConnected } from '@lib/stores/settings/settings';
    import { Content, Grid } from 'carbon-components-svelte';

    import SettingsDatabase from './SettingsDatabase.svelte';
    import SettingsCoding from './SettingsCoding.svelte';
    import SettingsLocalization from './SettingsLocalization.svelte';
    import SettingsConversations from './SettingsConversations.svelte';
</script>

<div class="settings">
    <Content>
        <Grid noGutter>
            <SettingsDatabase />
            {#if $dbConnected}
                <SettingsCoding />
                <SettingsLocalization />
                <SettingsConversations />
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
