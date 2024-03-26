<script lang="ts">
    import {
        buildImportLocalizationFormat,
        buildImportPathLocalization,
        dbConnectionConfig,
        dbType,
    } from '@lib/stores/settings/settings';
    import {
        Button,
        Dropdown,
        Modal,
        OverflowMenuItem,
        Tile,
        Tooltip,
    } from 'carbon-components-svelte';
    import FileSelector from '../common/FileSelector.svelte';
    import {
        DATABASE_TYPE_POSTGRES,
        DATABASE_TYPE_SQLITE,
        LOCALIZATION_FORMAT_DROPDOWN_ITEMS,
    } from '@common/common-types';
    import { APP_NAME } from '@common/constants';
    import type { IsLoadingStore } from '@lib/stores/utility/is-loading-store';
    import type { DialogResult } from 'preload/api-dialog';
    import type { DatabaseInfo, LocalizationImportRequest } from 'preload/api-build';
    import { get } from 'svelte/store';
    import { getDecryptedDbConfig } from '@lib/utility/crypto';

    export let isLoading: IsLoadingStore;

    let isModalOpen: boolean = false;

    async function onSelectLocalizationImportLocation(): Promise<void> {
        const openResult: DialogResult = await isLoading.wrapPromise(
            window.api.dialog.importLocationLocalizationSelect(),
        );
        if (openResult.cancelled) return;
        $buildImportPathLocalization = openResult;
    }

    async function onImport(): Promise<void> {
        await isLoading.wrapPromise(
            window.api.build.localizationImport(<LocalizationImportRequest>{
                database: <DatabaseInfo>{
                    database: get(dbType),
                    databaseConfig: getDecryptedDbConfig(),
                },
                format: $buildImportLocalizationFormat,
                location: $buildImportPathLocalization.path,
            }),
        );
    }

    async function onConfirmImport(): Promise<void> {
        isModalOpen = false;
        await onImport();
    }
</script>

<Tile>
    <h3>Import</h3>
    <p>
        <Tooltip triggerText="Import Location" align="start" direction="bottom">
            <p>
                This setting decides which folder to import your localized text from. {APP_NAME}
                will scan the directory you select for files with extensions that match the format you
                select (eg. CSV files are expected to have the .csv extension).
            </p>
        </Tooltip>
        <FileSelector
            buttonDisabled={$isLoading}
            buttonText={'Select Location'}
            on:click={onSelectLocalizationImportLocation}
            fieldText={$buildImportPathLocalization.path}
            fieldPlaceholder={'Localization import path...'}
        >
            <svelte:fragment slot="overflow">
                <OverflowMenuItem
                    text="Clear"
                    danger
                    disabled={$buildImportPathLocalization.path === '' || $isLoading}
                    on:click={() => {
                        $buildImportPathLocalization.path = '';
                    }}
                />
            </svelte:fragment>
        </FileSelector>
    </p>
    <p>
        <Tooltip triggerText="Import Format" align="start" direction="bottom">
            <p>
                This settings decides the localization file format {APP_NAME} will expect to find in
                the selected localization import directory.
            </p>
        </Tooltip>
        <Dropdown
            size="sm"
            disabled={$isLoading}
            bind:selectedId={$buildImportLocalizationFormat}
            items={LOCALIZATION_FORMAT_DROPDOWN_ITEMS}
        />
    </p>
    <p>
        <sup>Import</sup>
        <br />
        <Button size="small" on:click={() => (isModalOpen = true)} disabled={$isLoading}
            >Import</Button
        >
    </p>
</Tile>

<Modal
    size="sm"
    danger
    bind:open={isModalOpen}
    modalHeading="Are you sure?"
    primaryButtonText="Import Localizations"
    secondaryButtonText="Cancel"
    on:click:button--secondary={() => (isModalOpen = false)}
    on:submit={onConfirmImport}
>
    <p>
        This will import all localizations found in the localization file or files found in the
        specified directory. This operation cannot be undone so it might be wise to backup first.
    </p>
</Modal>
