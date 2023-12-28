<script lang="ts">
    import {
        dbConnected,
        dbSqlitePath,
        dbSqlitePathError,
        dbType,
    } from '@lib/stores/settings/settings';
    import { Dropdown, FileUploaderItem, Button, Tag, Row, Column } from 'carbon-components-svelte';
    import { writeFile, type WriteFileOptions } from '@tauri-apps/plugin-fs';
    import { exists } from '@tauri-apps/plugin-fs';
    import { save } from '@tauri-apps/plugin-dialog';
    import { FILE_DB_EXTENSION_FILTER } from '@lib/constants/file';
    import { type DropdownItem } from 'carbon-components-svelte/src/Dropdown/Dropdown.svelte';
    import { DATABASE_TYPES, type DatabaseType } from '@lib/api/db/db-types';
    import type { FileDetails } from '@lib/utility/file-details';
    import { basename } from '@tauri-apps/api/path';

    // Database type dropdown
    const databaseOptions: DropdownItem[] = DATABASE_TYPES.map(
        (dbType: DatabaseType) =>
            <DropdownItem>{
                id: dbType.name,
                text: dbType.name,
            },
    );

    // SQLite database file handler
    async function handleSqliteFileDialog() {
        // Grab file path
        let filePath: string | null = await save({
            title: 'Create or Select a Database',
            filters: [FILE_DB_EXTENSION_FILTER],
        });
        if (!filePath) return;

        // Does the file exist
        const isExtant = await exists(filePath);

        // Stat or touch file
        if (!isExtant) {
            // TODO: https://github.com/tauri-apps/plugins-workspace/issues/856
            await writeFile(filePath, new Uint8Array(), {});
        }

        const baseName: string = await basename(filePath);
        $dbSqlitePath = <FileDetails>{
            path: filePath,
            fileName: baseName,
        };
    }

    function resetConnection() {
        dbSqlitePath.update((dbPath) => {
            dbPath.path = '';
            return dbPath;
        });
        dbSqlitePathError.set('');
    }
</script>

<Row>
    <Column>
        <h2>Database</h2>
        <p>
            <sup>Database Type</sup>
            <Dropdown size="sm" bind:selectedId={$dbType} items={databaseOptions} />
        </p>
        {#if $dbType === 'SQLite'}
            <p>
                <sup>Database File</sup>
                <Button size="small" on:click={handleSqliteFileDialog}>Select database</Button>
                {#if $dbSqlitePath.path}
                    <div class="button-span">
                        {#if $dbConnected}
                            <FileUploaderItem
                                style="margin-bottom:0px;"
                                size="small"
                                name={$dbSqlitePath.fileName}
                                status="edit"
                                on:delete={resetConnection}
                            />
                            <Tag type="green">Connected</Tag>
                        {:else if $dbSqlitePathError}
                            <FileUploaderItem
                                invalid
                                style="margin-bottom:0px;"
                                size="small"
                                name={$dbSqlitePath.fileName}
                                errorSubject={$dbSqlitePathError}
                                errorBody="Please select a new file."
                                status="edit"
                                on:delete={resetConnection}
                            />
                        {:else}
                            <FileUploaderItem
                                style="margin-bottom:0px;"
                                size="small"
                                name={$dbSqlitePath.fileName}
                                status="uploading"
                                on:delete={resetConnection}
                            />
                        {/if}
                    </div>
                {/if}
            </p>
        {/if}
    </Column>
</Row>

<style>
    .button-span {
        display: flex;
        gap: var(--cds-spacing-03);
        align-items: center;
        margin-top: var(--cds-spacing-03);
    }
</style>
