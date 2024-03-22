<script lang="ts">
    import { dbConnected, dbConnectionConfig, dbType } from '@lib/stores/settings/settings';
    import { Button, Dropdown, OverflowMenuItem, Tooltip } from 'carbon-components-svelte';
    import type { DialogResult } from 'preload/api-dialog';
    import FileSelector from '../common/FileSelector.svelte';
    import DockableRow from '../app/DockableRow.svelte';
    import DockableColumn from '../app/DockableColumn.svelte';
    import {
        DATABASE_TYPE_DROPDOWN_ITEMS,
        DATABASE_TYPE_POSTGRES,
        DATABASE_TYPE_SQLITE,
    } from '@common/common-types';
    import type { DbConnectionConfig } from '@common/common-db-types';
    import { db } from '@lib/api/db/db';
    import { get } from 'svelte/store';
    import PersistedInput from '../common/PersistedInput.svelte';
    import {
        DB_PG_CONFIG_PLACEHOLDER_ADDRESS,
        DB_PG_CONFIG_PLACEHOLDER_DATABASE,
        DB_PG_CONFIG_PLACEHOLDER_PASSWORD,
        DB_PG_CONFIG_PLACEHOLDER_PORT,
        DB_PG_CONFIG_PLACEHOLDER_USERNAME,
        DB_PG_CONFIG_UNDO_ADDRESS,
        DB_PG_CONFIG_UNDO_DATABASE,
        DB_PG_CONFIG_UNDO_PASSWORD,
        DB_PG_CONFIG_UNDO_PORT,
        DB_PG_CONFIG_UNDO_USERNAME,
    } from '@lib/constants/settings';

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
            await db.disconnect();
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
            await db.disconnect();
            await db.connect(get(dbConnectionConfig), false);
        } catch (error) {
            resetConnectionConfig();
            throw error;
        }
    }

    async function pgConnect(): Promise<void> {
        try {
            const dbConfig: DbConnectionConfig = cloneDbConfig(get(dbConnectionConfig));
            const isInitialized: boolean = await db.isDbInitialized(dbConfig);
            await db.connect(get(dbConnectionConfig), !isInitialized);
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
            // for (const key of Object.keys(config)) config[key] = '';
            config.sqliteFile = '';
            return config;
        });
    }

    function cloneDbConfig(dbConfig: DbConnectionConfig): DbConnectionConfig {
        dbConfig = <DbConnectionConfig>{ ...get(dbConnectionConfig) };
        dbConfig.pgPassword = onReadPassword(dbConfig.pgPassword);
        return dbConfig;
    }

    function onReadPassword(str: string): string {
        if (str) {
            return window.api.cryptography.decrypt({
                toDecrypt: str,
            }).decrypted;
        }
        return str;
    }

    function onWritePassword(str: string): string {
        if (str) {
            return window.api.cryptography.encrypt({
                toEncrypt: str,
            }).encrypted;
        }
        return str;
    }

    // Attempt connection on startup if schema exists
    async function attemptConnection(): Promise<void> {
        const dbConfig: DbConnectionConfig = cloneDbConfig(get(dbConnectionConfig));
        if (await db.isDbInitialized(dbConfig)) {
            await db.disconnect();
            try {
                await db.connect(dbConfig, false);
            } catch (error) {
                resetConnectionConfig();
                throw error;
            }
        } else {
            resetConnectionConfig();
        }
    }
    attemptConnection();
</script>

<DockableRow isFullHeight={false}>
    <DockableColumn>
        <h2>Database</h2>
        <p>
            <sup>Database Type</sup>
            <Dropdown
                size="sm"
                bind:selectedId={$dbType}
                items={DATABASE_TYPE_DROPDOWN_ITEMS}
                disabled={$dbConnected}
            />
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
        {:else if $dbType === DATABASE_TYPE_POSTGRES.id}
            <p>
                <sup>Database Address</sup>
                <PersistedInput
                    persistent={dbConnectionConfig}
                    columnName={'pgAddress'}
                    undoText={DB_PG_CONFIG_UNDO_ADDRESS}
                    inputPlaceholder={DB_PG_CONFIG_PLACEHOLDER_ADDRESS}
                    disabled={$dbConnected}
                />
            </p>
            <p>
                <sup>Database Port</sup>
                <PersistedInput
                    persistent={dbConnectionConfig}
                    columnName={'pgPort'}
                    undoText={DB_PG_CONFIG_UNDO_PORT}
                    inputPlaceholder={DB_PG_CONFIG_PLACEHOLDER_PORT}
                    isNumber={true}
                    numberMin={0}
                    numberMax={65535}
                    disabled={$dbConnected}
                />
            </p>
            <p>
                <Tooltip triggerText="Database Name" align="start" direction="bottom">
                    <p>The database must already exist.</p>
                </Tooltip>
                <PersistedInput
                    persistent={dbConnectionConfig}
                    columnName={'pgDatabase'}
                    undoText={DB_PG_CONFIG_UNDO_DATABASE}
                    inputPlaceholder={DB_PG_CONFIG_PLACEHOLDER_DATABASE}
                    disabled={$dbConnected}
                    enforceLowercase={true}
                />
            </p>
            <p>
                <sup>Database Username</sup>
                <PersistedInput
                    persistent={dbConnectionConfig}
                    columnName={'pgUsername'}
                    undoText={DB_PG_CONFIG_UNDO_USERNAME}
                    inputPlaceholder={DB_PG_CONFIG_PLACEHOLDER_USERNAME}
                    disabled={$dbConnected}
                />
            </p>
            <p>
                <sup>Database Password</sup>
                <PersistedInput
                    persistent={dbConnectionConfig}
                    columnName={'pgPassword'}
                    undoText={DB_PG_CONFIG_UNDO_PASSWORD}
                    inputPlaceholder={DB_PG_CONFIG_PLACEHOLDER_PASSWORD}
                    disabled={$dbConnected}
                    isPassword={true}
                    readWrapper={onReadPassword}
                    writeWrapper={onWritePassword}
                />
            </p>
            <p>
                <sup>Connect</sup><br />
                {#if $dbConnected}
                    <Button size="small" kind="danger">Disconnect</Button>
                {:else}
                    <Button size="small" on:click={pgConnect}>Connect</Button>
                {/if}
            </p>
        {/if}
    </DockableColumn>
</DockableRow>
