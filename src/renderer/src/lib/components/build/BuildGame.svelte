<script lang="ts">
    import { Button, OverflowMenuItem, Tooltip } from 'carbon-components-svelte';
    import FileSelector from '../common/FileSelector.svelte';
    import { buildExportPathData, buildExportPathRoutines } from '@lib/stores/settings/settings';
    import type { DialogResult } from 'preload/api-dialog';
    import { IsLoadingStore } from '@lib/stores/utility/is-loading-store';
    import { APP_NAME } from '@common/constants';

    const isLoading: IsLoadingStore = new IsLoadingStore();

    async function onSelectDataLocation(): Promise<void> {
        const openResult: DialogResult = await isLoading.wrapPromise(
            window.api.dialog.exportLocationDataSelect(),
        );
        if (openResult.cancelled) return;
        $buildExportPathData = openResult;
    }

    async function onSelectRoutineLocation(): Promise<void> {
        const openResult: DialogResult = await isLoading.wrapPromise(
            window.api.dialog.exportLocationRoutinesSelect(),
        );
        if (openResult.cancelled) return;
        $buildExportPathRoutines = openResult;
    }

    async function onExport(): Promise<void> {
        // TODO
    }
</script>

<h2>Game</h2>
<p>
    <Tooltip triggerText="Data Export Location" align="start" direction="bottom">
        <p>
            {APP_NAME} exports all localization and conversation graph data to a single compressed file
            that is used by the {APP_NAME} engine modules at runtime. This setting dictates which folder
            the data file will be exported to.
        </p>
    </Tooltip>
    <FileSelector
        buttonDisabled={$isLoading}
        buttonText={'Select Location'}
        on:click={onSelectDataLocation}
        fieldText={$buildExportPathData.path}
        fieldPlaceholder={'Data export path...'}
    >
        <svelte:fragment slot="overflow">
            <OverflowMenuItem
                text="Clear"
                danger
                disabled={$buildExportPathData.path === '' || $isLoading}
                on:click={() => {
                    $buildExportPathData.path = '';
                }}
            />
        </svelte:fragment>
    </FileSelector>
</p>
<p>
    <Tooltip triggerText="Routine Export Location" align="start" direction="bottom">
        <p>
            {APP_NAME} transpiles all routines to the language of your choosing and then exports all
            generated code this directory.
        </p>
    </Tooltip>
    <FileSelector
        buttonText={'Select Location'}
        buttonDisabled={$isLoading}
        on:click={onSelectRoutineLocation}
        fieldText={$buildExportPathRoutines.path}
        fieldPlaceholder={'Routines export path...'}
    >
        <svelte:fragment slot="overflow">
            <OverflowMenuItem
                text="Clear"
                danger
                disabled={$buildExportPathRoutines.path === '' || $isLoading}
                on:click={() => {
                    $buildExportPathRoutines.path = '';
                }}
            />
        </svelte:fragment>
    </FileSelector>
</p>
<p>
    <sup>Export</sup>
    <br />
    <Button size="small" on:click={onExport} disabled={$isLoading}>Export</Button>
</p>
