<script lang="ts">
    import SettingsLocales from './SettingsLocales.svelte';
    import DockableRow from '../app/DockableRow.svelte';
    import DockableColumn from '../app/DockableColumn.svelte';
</script>

<DockableRow isFullHeight={false}>
    <DockableColumn>
        <h2>Localization</h2>
        <SettingsLocales />
    </DockableColumn>
</DockableRow>
