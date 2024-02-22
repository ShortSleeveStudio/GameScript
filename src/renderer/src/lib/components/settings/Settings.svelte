<script lang="ts">
    import { dbConnected } from '@lib/stores/settings/settings';
    import SettingsDatabase from './SettingsDatabase.svelte';
    import SettingsCoding from './SettingsCoding.svelte';
    import SettingsLocalization from './SettingsLocalization.svelte';
    import SettingsConversations from './SettingsConversations.svelte';
    import SettingsActors from './SettingsActors.svelte';
    import DockableContent from '../app/DockableContent.svelte';
    import DockableRow from '../app/DockableRow.svelte';
    import DockableColumn from '../app/DockableColumn.svelte';
</script>

<DockableContent minWidth={70 * 8}>
    <DockableRow>
        <DockableColumn>
            <SettingsDatabase />
            {#if $dbConnected}
                <SettingsCoding />
                <SettingsActors />
                <SettingsLocalization />
                <SettingsConversations />
            {/if}
        </DockableColumn>
    </DockableRow>
</DockableContent>
