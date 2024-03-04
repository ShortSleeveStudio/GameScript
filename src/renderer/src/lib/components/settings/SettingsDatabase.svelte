<script lang="ts">
    import { dbConnectionConfig, dbType } from '@lib/stores/settings/settings';
    import { Dropdown, OverflowMenuItem } from 'carbon-components-svelte';
    import type { DialogResult } from 'preload/api-dialog';
    import FileSelector from '../common/FileSelector.svelte';
    import DockableRow from '../app/DockableRow.svelte';
    import DockableColumn from '../app/DockableColumn.svelte';
    import { DATABASE_TYPE_DROPDOWN_ITEMS, DATABASE_TYPE_SQLITE } from '@common/common-types';
    import type { DbConnectionConfig } from '@common/common-db-types';
    import { db } from '@lib/api/db/db';
    import { get } from 'svelte/store';

    // TODO - connection failures
    //         this._sqlitePathStore.update(dialogResultReset);
    //         this.isError(e);
    //         // https://svelte-5-preview.vercel.app/status
    //         const errors: Error[] = get(this._appInitializationErrors);
    //         errors.push(<Error>e);
    //         this._appInitializationErrors.set(errors);

    async function sqliteDatabaseDialogNew(): Promise<void> {
        const saveResult: DialogResult = await window.api.dialog.sqliteDbSave();
        if (saveResult.cancelled) return;
        dbConnectionConfig.update((config: DbConnectionConfig) => {
            config.sqliteFile = saveResult.fullPath;
            return config;
        });
        try {
            await db.connect(get(dbConnectionConfig), true);
        } catch (error) {
            resetConnectionConfig();
            throw error;
        }
    }

    async function sqliteDatabaseDialogOpen(): Promise<void> {
        const openResult: DialogResult = await window.api.dialog.sqliteDbOpen();
        if (openResult.cancelled) return;
        dbConnectionConfig.update((config: DbConnectionConfig) => {
            config.sqliteFile = openResult.fullPath;
            return config;
        });
        try {
            await db.connect(get(dbConnectionConfig), false);
        } catch (error) {
            resetConnectionConfig();
            throw error;
        }
    }

    async function resetConnection(): Promise<void> {
        resetConnectionConfig();
        await db.disconnect();
    }

    function resetConnectionConfig(): void {
        dbConnectionConfig.update((config: DbConnectionConfig) => {
            config.sqliteFile = '';
            return config;
        });
    }

    // Attempt connection on startup if schema exists
    async function attemptConnection(): Promise<void> {
        if (await db.isDbInitialized(get(dbConnectionConfig))) {
            db.connect(get(dbConnectionConfig), false).catch((error) => {
                resetConnectionConfig();
                throw error;
            });
        }
    }
    attemptConnection();
</script>

<DockableRow isFullHeight={false}>
    <DockableColumn>
        <h2>Database</h2>
        <p>
            <sup>Database Type</sup>
            <Dropdown size="sm" bind:selectedId={$dbType} items={DATABASE_TYPE_DROPDOWN_ITEMS} />
        </p>
        {#if $dbType === DATABASE_TYPE_SQLITE.id}
            <p>
                <sup>Database File</sup>
                <FileSelector
                    buttonText={'Open Database'}
                    on:click={sqliteDatabaseDialogOpen}
                    fieldText={$dbConnectionConfig.sqliteFile}
                    fieldPlaceholder={'Database file...'}
                >
                    <svelte:fragment slot="overflow">
                        <OverflowMenuItem text="New Database" on:click={sqliteDatabaseDialogNew} />
                        <OverflowMenuItem
                            text="Close Database"
                            danger
                            on:click={resetConnection}
                            disabled={$dbConnectionConfig.sqliteFile === ''}
                        />
                    </svelte:fragment>
                </FileSelector>
            </p>
        {/if}
    </DockableColumn>
</DockableRow>
