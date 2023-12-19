<script lang="ts">
    import {
        DATABASE_TYPES,
        dbConnected,
        dbSqlitePath,
        dbSqlitePathError,
        dbType,
        type DropdownItem,
    } from '@lib/stores/settings/settings';
    import { Dropdown, Form, FormGroup, FileUploaderItem, Button } from 'carbon-components-svelte';
    import { open } from '@tauri-apps/plugin-dialog';
    import { FILE_DB_EXTENSION_FILTER } from '@lib/constants/file';
    import { type FileResponse } from '@lib/types/file-response';

    // Database type dropdown
    const databaseOptions: DropdownItem[] = DATABASE_TYPES.map(
        (name) =>
            <DropdownItem>{
                id: name,
                text: name,
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
                {#if $dbConnected}
                    <FileUploaderItem size="small" name={$dbSqlitePath.name} status="complete" />
                {:else}
                    <FileUploaderItem
                        invalid
                        size="small"
                        name={$dbSqlitePath.name}
                        errorSubject={$dbSqlitePathError}
                        errorBody="Please select a new file."
                        status="uploading"
                    />
                {/if}
            {/if}
        </FormGroup>
    {/if}
</Form>
