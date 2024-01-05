<script lang="ts">
    import { dbSqlitePath, dbType } from '@lib/stores/settings/settings';
    import {
        Dropdown,
        Button,
        Row,
        Column,
        TextInput,
        OverflowMenu,
        OverflowMenuItem,
    } from 'carbon-components-svelte';
    import { writeFile } from '@tauri-apps/plugin-fs';
    import { exists } from '@tauri-apps/plugin-fs';
    import { save, open } from '@tauri-apps/plugin-dialog';
    import { FILE_DB_EXTENSION_FILTER } from '@lib/constants/file';
    import { type DropdownItem } from 'carbon-components-svelte/src/Dropdown/Dropdown.svelte';
    import type { FileDetails } from '@lib/utility/file-details';
    import { basename } from '@tauri-apps/api/path';
    import { DATABASE_TYPES, type DatabaseType } from '@lib/api/db/db-types';
    import { OverflowMenuVertical } from 'carbon-icons-svelte';

    // Database type dropdown
    const databaseOptions: DropdownItem[] = DATABASE_TYPES.map(
        (dbType: DatabaseType) =>
            <DropdownItem>{
                id: dbType.name,
                text: dbType.name,
            },
    );

    async function sqliteDatabaseDialogNew() {
        // Grab file path
        let filePath: string | null = await save({
            title: 'Create or Select a Database',
            filters: [FILE_DB_EXTENSION_FILTER],
        });
        if (!filePath) return;

        // Does the file exist
        const isExtant = await exists(filePath);

        // Touch file
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

    async function sqliteDatabaseDialogOpen() {
        let file = await open({
            multiple: false,
            directory: false,
            filters: [FILE_DB_EXTENSION_FILTER],
        });
        if (file && file.path) {
            $dbSqlitePath = <FileDetails>{
                path: file.path,
                fileName: file.name,
            };
        }
    }

    function resetConnection() {
        dbSqlitePath.update((dbPath) => {
            dbPath.path = '';
            return dbPath;
        });
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
                <span class="button-set">
                    <Button size="small" on:click={sqliteDatabaseDialogOpen}>Open Database</Button>
                    <TextInput
                        size="sm"
                        disabled={true}
                        value={$dbSqlitePath.fileName}
                        placeholder="Database file..."
                    />
                    <OverflowMenu flipped size="sm" style="width: auto;">
                        <div slot="menu">
                            <Button
                                tooltipPosition="left"
                                iconDescription="Options"
                                size="small"
                                kind="secondary"
                                icon={OverflowMenuVertical}
                            />
                        </div>
                        <OverflowMenuItem text="New Database" on:click={sqliteDatabaseDialogNew} />
                        <OverflowMenuItem text="Close Database" danger on:click={resetConnection} />
                    </OverflowMenu>
                </span>
            </p>
        {/if}
    </Column>
</Row>

<style>
    .overflow-button {
        background-color: var(--cds-field, #f4f4f4);

        /* background-color: var(--cds-interactive-02, #393939); */
    }
    .button-span {
        display: flex;
        gap: var(--cds-spacing-03);
        align-items: center;
        margin-top: var(--cds-spacing-03);
    }
</style>
