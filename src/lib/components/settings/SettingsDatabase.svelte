<script lang="ts">
    import {
        dbConnected,
        dbSqlitePath,
        dbSqlitePathError,
        dbType,
    } from '@lib/stores/settings/settings';
    import {
        Dropdown,
        Form,
        FormGroup,
        FileUploaderItem,
        Button,
        Tag,
    } from 'carbon-components-svelte';

    import { open } from '@tauri-apps/plugin-dialog';
    import { FILE_DB_EXTENSION_FILTER } from '@lib/constants/file';
    import { type FileResponse } from '@lib/vendor/types/file-response';
    import { type DropdownItem } from 'carbon-components-svelte/src/Dropdown/Dropdown.svelte';
    import { DATABASE_TYPES, type DatabaseType } from '@lib/api/db/db-types';

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
        let file: FileResponse | null = await open({
            multiple: false,
            directory: false,
            filters: [FILE_DB_EXTENSION_FILTER],
        });
        if (file && file.path) {
            $dbSqlitePath = file;
        }
    }

    function resetConnection() {
        dbSqlitePath.update((dbPath) => {
            dbPath.path = '';
            return dbPath;
        });
        dbSqlitePathError.set('');
    }
</script>

<Form>
    <FormGroup>
        <Dropdown
            size="sm"
            titleText="Database Type"
            bind:selectedId={$dbType}
            items={databaseOptions}
        />
    </FormGroup>
    {#if $dbType === 'SQLite'}
        <FormGroup legendText="Database File">
            <Button size="small" on:click={handleSqliteFileDialog}>Select database</Button>
            {#if $dbSqlitePath.path}
                <br />
                <br />
                <div class="button-span">
                    {#if $dbConnected}
                        <FileUploaderItem
                            style="margin-bottom:0px;"
                            size="small"
                            name={$dbSqlitePath.name}
                            status="edit"
                            on:delete={resetConnection}
                        />
                        <Tag type="green">Connected</Tag>
                    {:else if $dbSqlitePathError}
                        <FileUploaderItem
                            invalid
                            style="margin-bottom:0px;"
                            size="small"
                            name={$dbSqlitePath.name}
                            errorSubject={$dbSqlitePathError}
                            errorBody="Please select a new file."
                            status="edit"
                            on:delete={resetConnection}
                        />
                    {:else}
                        <FileUploaderItem
                            style="margin-bottom:0px;"
                            size="small"
                            name={$dbSqlitePath.name}
                            status="uploading"
                            on:delete={resetConnection}
                        />
                    {/if}
                </div>
            {/if}
        </FormGroup>
    {/if}
</Form>

<style>
    .button-span {
        display: flex;
        gap: var(--cds-spacing-03);
        align-items: center;
    }
</style>
