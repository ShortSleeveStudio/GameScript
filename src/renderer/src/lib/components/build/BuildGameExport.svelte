<script lang="ts">
    import { APP_NAME } from '@common/constants';

    import { Button, OverflowMenuItem, Tile, Tooltip } from 'carbon-components-svelte';
    import FileSelector from '../common/FileSelector.svelte';
    import type { IsLoadingStore } from '@lib/stores/utility/is-loading-store';
    import { buildExportPathData, dbType } from '@lib/stores/settings/settings';
    import type { DialogResult } from 'preload/api-dialog';
    import type { DatabaseInfo, GameExportRequest } from 'preload/api-build';
    import { get } from 'svelte/store';
    import { getDecryptedDbConfig } from '@lib/utility/crypto';

    export let isLoading: IsLoadingStore;

    async function onSelectDataLocation(): Promise<void> {
        const openResult: DialogResult = await isLoading.wrapPromise(
            window.api.dialog.exportLocationDataSelect(),
        );
        if (openResult.cancelled) return;
        $buildExportPathData = openResult;
    }

    async function onExport(): Promise<void> {
        await isLoading.wrapPromise(
            window.api.build.gameExport(<GameExportRequest>{
                database: <DatabaseInfo>{
                    database: get(dbType),
                    databaseConfig: getDecryptedDbConfig(),
                },
                dataLocation: $buildExportPathData.path,
            }),
        );
    }
</script>

<Tile>
    <h3>Export</h3>
    <p>
        <Tooltip triggerText="Data Export Location" align="start" direction="bottom">
            <p>
                This folder is where {APP_NAME} will export all localization and conversation graph data
                to be used by the {APP_NAME} engine modules which ultimately build your game.
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
        <sup>Export</sup>
        <br />
        <Button
            size="small"
            on:click={onExport}
            disabled={$isLoading || !buildExportPathData || !$buildExportPathData.path}
            >Export</Button
        >
    </p>
</Tile>
