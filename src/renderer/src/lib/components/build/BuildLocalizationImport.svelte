<script lang="ts">
    import {
        buildExportLocalizationFormat,
        buildImportPathLocalization,
    } from '@lib/stores/settings/settings';
    import { Dropdown, OverflowMenuItem, Tile, Tooltip } from 'carbon-components-svelte';
    import FileSelector from '../common/FileSelector.svelte';
    import { LOCALIZATION_FORMAT_DROPDOWN_ITEMS } from '@common/common-types';
    import { APP_NAME } from '@common/constants';
    import type { IsLoadingStore } from '@lib/stores/utility/is-loading-store';
    import type { DialogResult } from 'preload/api-dialog';

    export let isLoading: IsLoadingStore;

    async function onSelectLocalizationImportLocation(): Promise<void> {
        const openResult: DialogResult = await isLoading.wrapPromise(
            window.api.dialog.importLocationLocalizationSelect(),
        );
        if (openResult.cancelled) return;
        $buildImportPathLocalization = openResult;
    }
</script>

<Tile>
    <h3>Import</h3>
    <p>
        <Tooltip triggerText="Import Location" align="start" direction="bottom">
            <p>This setting decides which folder to import your localized text data from.</p>
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
            bind:selectedId={$buildExportLocalizationFormat}
            items={LOCALIZATION_FORMAT_DROPDOWN_ITEMS}
        />
    </p>
</Tile>
