<script lang="ts">
    import SettingsCodingImports from './SettingsCodingImports.svelte';
    import SettingsCodingAutoComplete from './SettingsCodingAutoComplete.svelte';
    import SettingsCodingLanguageSelect from './SettingsCodingLanguageSelect.svelte';
    import SettingsCodingDefaultRoutines from './SettingsCodingDefaultRoutines.svelte';
    import DockableRow from '../app/DockableRow.svelte';
    import DockableColumn from '../app/DockableColumn.svelte';
</script>

<DockableRow isFullHeight={false}>
    <DockableColumn>
        <h2>Coding</h2>
        <SettingsCodingLanguageSelect />
        <SettingsCodingImports />
        <SettingsCodingDefaultRoutines />
        <SettingsCodingAutoComplete />
    </DockableColumn>
</DockableRow>
