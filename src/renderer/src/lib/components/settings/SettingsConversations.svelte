<script lang="ts">
    import SettingsConversationsFilters from './SettingsConversationsFilters.svelte';
    import SettingsConversationsLayout from './SettingsConversationsLayout.svelte';
    import DockableRow from '../app/DockableRow.svelte';
    import DockableColumn from '../app/DockableColumn.svelte';
    import SettingsConversationsNodeProperties from './SettingsConversationsNodeProperties.svelte';
</script>

<DockableRow isFullHeight={false}>
    <DockableColumn>
        <h2>Conversations</h2>
        <SettingsConversationsLayout />
        <SettingsConversationsFilters />
        <SettingsConversationsNodeProperties />
    </DockableColumn>
</DockableRow>
