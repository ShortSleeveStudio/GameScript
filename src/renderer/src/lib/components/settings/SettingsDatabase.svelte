<script lang="ts">
    import { dbConnectionConfig, dbType } from '@lib/stores/settings/settings';
    import { Dropdown, OverflowMenuItem } from 'carbon-components-svelte';
    import type { DialogResult } from 'preload/api-dialog';
    import FileSelector from '../common/FileSelector.svelte';
    import DockableRow from '../app/DockableRow.svelte';
    import DockableColumn from '../app/DockableColumn.svelte';
    import {
        DATABASE_TYPE_DROPDOWN_ITEMS,
        DATABASE_TYPE_SQLITE,
        TABLE_ACTORS,
        TABLE_ACTOR_PRINCIPAL,
        TABLE_LOCALES,
        TABLE_LOCALE_PRINCIPAL,
        TABLE_PROGRAMMING_LANGUAGES,
        TABLE_PROGRAMMING_LANGUAGE_PRINCIPAL,
        TABLE_ROUTINES,
        TABLE_ROUTINE_TYPES,
    } from '@common/common-types';
    import type { DbConnectionConfig } from '@common/common-db-types';
    import { db } from '@lib/api/db/db';
    import { get } from 'svelte/store';
    import { DB_INITIAL_ROWS, type InitialTableRows } from '@common/common-db-initialization';
    import type { Actor, Locale } from '@common/common-schema';
    import { actorsCreate } from '@lib/crud/actor-crud';
    import { IsLoadingStore } from '@lib/stores/utility/is-loading-store';
    import { localesCreate } from '@lib/crud/locale-crud';
    import { CREATE_TABLE_INFOS } from '@common/common-queries-sqlite';

    // TODO - connection failures
    //         this._sqlitePathStore.update(dialogResultReset);
    //         this.isError(e);
    //         // https://svelte-5-preview.vercel.app/status
    //         const errors: Error[] = get(this._appInitializationErrors);
    //         errors.push(<Error>e);
    //         this._appInitializationErrors.set(errors);

    const isLoading: IsLoadingStore = new IsLoadingStore();

    async function sqliteDatabaseDialogNew(): Promise<void> {
        const saveResult: DialogResult = await window.api.dialog.sqliteDbSave();
        if (saveResult.cancelled) return;
        dbConnectionConfig.update((config: DbConnectionConfig) => {
            config.sqliteFile = saveResult.fullPath;
            return config;
        });
        try {
            await db.connect(get(dbConnectionConfig), initializeSqlite);
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
            await db.connect(get(dbConnectionConfig));
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

    async function initializeSqlite(): Promise<void> {
        await db.initializeSchema();
        await initializeRows();
    }

    // TODO - find a better place for this
    async function initializeRows(): Promise<void> {
        for (let i = 0; i < DB_INITIAL_ROWS.length; i++) {
            const initialTableRows: InitialTableRows = DB_INITIAL_ROWS[i];
            switch (initialTableRows.table.id) {
                case TABLE_PROGRAMMING_LANGUAGES.id:
                case TABLE_PROGRAMMING_LANGUAGE_PRINCIPAL.id:
                case TABLE_ROUTINE_TYPES.id:
                case TABLE_ROUTINES.id:
                case TABLE_LOCALE_PRINCIPAL.id:
                case TABLE_ACTOR_PRINCIPAL.id: {
                    await db.createRows(initialTableRows.table, initialTableRows.rows);
                    break;
                }
                case TABLE_LOCALES.id: {
                    await localesCreate(<Locale[]>initialTableRows.rows, isLoading, false);
                    break;
                }
                case TABLE_ACTORS.id: {
                    await actorsCreate(<Actor[]>initialTableRows.rows, isLoading, false);
                    break;
                }
                default: {
                    throw new Error(
                        `Tried to initialize unknown table: ${initialTableRows.table.name}`,
                    );
                }
            }
        }
    }
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
