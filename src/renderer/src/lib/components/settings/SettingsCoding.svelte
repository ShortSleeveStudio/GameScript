<script lang="ts">
    import { Column, Row } from 'carbon-components-svelte';

    import SettingsCodingImports from './SettingsCodingImports.svelte';
    import SettingsCodingAutoComplete from './SettingsCodingAutoComplete.svelte';
    import SettingsCodingLanguageSelect from './SettingsCodingLanguageSelect.svelte';
    import SettingsCodingDefaultRoutines from './SettingsCodingDefaultRoutines.svelte';
</script>

<Row>
    <Column>
        <h2>Coding</h2>
        <SettingsCodingLanguageSelect />
        <SettingsCodingImports />
        <SettingsCodingDefaultRoutines />
        <SettingsCodingAutoComplete />
    </Column>
</Row>
