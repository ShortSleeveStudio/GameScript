<script lang="ts">
    import SettingsActorsTable from './SettingsActorsTable.svelte';
    import DockableColumn from '../app/DockableColumn.svelte';
    import DockableRow from '../app/DockableRow.svelte';
</script>

<DockableRow isFullHeight={false}>
    <DockableColumn>
        <h2>Actors</h2>
        <SettingsActorsTable />
    </DockableColumn>
</DockableRow>
