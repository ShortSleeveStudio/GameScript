<script lang="ts">
    import { Button, Dropdown, OverflowMenuItem, Tile, Tooltip } from 'carbon-components-svelte';
    import FileSelector from '../common/FileSelector.svelte';
    import type { IsLoadingStore } from '@lib/stores/utility/is-loading-store';
    import type { DialogResult } from 'preload/api-dialog';
    import {
        buildExportLocalizationDivision,
        buildExportLocalizationFormat,
        buildExportPathLocalization,
        dbConnectionConfig,
        dbType,
    } from '@lib/stores/settings/settings';
    import type { DatabaseInfo, LocalizationExportRequest } from 'preload/api-build';
    import {
        DATABASE_TYPE_POSTGRES,
        DATABASE_TYPE_SQLITE,
        LOCALIZATION_DIVISION_DROPDOWN_ITEMS,
        LOCALIZATION_FORMAT_DROPDOWN_ITEMS,
    } from '@common/common-types';
    import { get } from 'svelte/store';

    export let isLoading: IsLoadingStore;

    async function onSelectLocalizationExportLocation(): Promise<void> {
        const openResult: DialogResult = await isLoading.wrapPromise(
            window.api.dialog.exportLocationRoutinesSelect(),
        );
        if (openResult.cancelled) return;
        $buildExportPathLocalization = openResult;
    }

    async function onExport(): Promise<void> {
        const database: DatabaseInfo = <DatabaseInfo>{};
        if ($dbType === DATABASE_TYPE_SQLITE.id) {
            database.database = DATABASE_TYPE_SQLITE.id;
            database.databaseConfig = get(dbConnectionConfig);
        } else {
            database.database = DATABASE_TYPE_POSTGRES.id;
            // TODO
        }
        await isLoading.wrapPromise(
            window.api.build.localizationExport(<LocalizationExportRequest>{
                database: database,
                format: $buildExportLocalizationFormat,
                division: $buildExportLocalizationDivision,
                location: $buildExportPathLocalization.path,
            }),
        );
    }
</script>

<Tile>
    <h3>Export</h3>
    <p>
        <Tooltip triggerText="Export Location" align="start" direction="bottom">
            <p>This setting decides which folder to export your localized text data to.</p>
        </Tooltip>
        <FileSelector
            buttonDisabled={$isLoading}
            buttonText={'Select Location'}
            on:click={onSelectLocalizationExportLocation}
            fieldText={$buildExportPathLocalization.path}
            fieldPlaceholder={'Localization export path...'}
        >
            <svelte:fragment slot="overflow">
                <OverflowMenuItem
                    text="Clear"
                    danger
                    disabled={$buildExportPathLocalization.path === '' || $isLoading}
                    on:click={() => {
                        $buildExportPathLocalization.path = '';
                    }}
                />
            </svelte:fragment>
        </FileSelector>
    </p>
    <p>
        <Tooltip triggerText="Export Division" align="start" direction="bottom">
            <p>This settings decides how to divide your localized text data.</p>
        </Tooltip>
        <Dropdown
            size="sm"
            disabled={$isLoading}
            bind:selectedId={$buildExportLocalizationDivision}
            items={LOCALIZATION_DIVISION_DROPDOWN_ITEMS}
        />
    </p>
    <p>
        <Tooltip triggerText="Export Format" align="start" direction="bottom">
            <p>This settings decides the format in which to export your localized text data.</p>
        </Tooltip>
        <Dropdown
            size="sm"
            disabled={$isLoading}
            bind:selectedId={$buildExportLocalizationFormat}
            items={LOCALIZATION_FORMAT_DROPDOWN_ITEMS}
        />
    </p>
    <p>
        <sup>Export</sup>
        <br />
        <Button size="small" on:click={onExport} disabled={$isLoading}>Export</Button>
    </p>
</Tile>
