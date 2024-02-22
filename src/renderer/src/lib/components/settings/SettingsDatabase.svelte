<script lang="ts">
    import { dbSqlitePath, dbType } from '@lib/stores/settings/settings';
    import { Dropdown, OverflowMenuItem } from 'carbon-components-svelte';
    import { type DropdownItem } from 'carbon-components-svelte/src/Dropdown/Dropdown.svelte';
    import { DATABASE_TYPES, type DatabaseType } from '@lib/api/db/db-types';
    import type { DialogResult } from 'preload/api-dialog';
    import { dialogResultReset } from '@lib/utility/dialog';
    import FileSelector from '../common/FileSelector.svelte';
    import DockableRow from '../app/DockableRow.svelte';
    import DockableColumn from '../app/DockableColumn.svelte';

    // Database type dropdown
    const databaseOptions: DropdownItem[] = DATABASE_TYPES.map(
        (dbType: DatabaseType) =>
            <DropdownItem>{
                id: dbType.name,
                text: dbType.name,
            },
    );

    async function sqliteDatabaseDialogNew(): Promise<void> {
        const saveResult: DialogResult = await window.api.dialog.sqliteDbSave();
        if (saveResult.cancelled) return;
        $dbSqlitePath = saveResult;
    }

    async function sqliteDatabaseDialogOpen(): Promise<void> {
        const openResult: DialogResult = await window.api.dialog.sqliteDbOpen();
        if (openResult.cancelled) return;
        $dbSqlitePath = openResult;
    }

    function resetConnection(): void {
        dbSqlitePath.update(dialogResultReset);
    }
</script>

<DockableRow isFullHeight={false}>
    <DockableColumn>
        <h2>Database</h2>
        <p>
            <sup>Database Type</sup>
            <Dropdown size="sm" bind:selectedId={$dbType} items={databaseOptions} />
        </p>
        {#if $dbType === 'SQLite'}
            <p>
                <sup>Database File</sup>
                <FileSelector
                    buttonText={'Open Database'}
                    on:click={sqliteDatabaseDialogOpen}
                    fieldText={$dbSqlitePath.baseName}
                    fieldPlaceholder={'Database file...'}
                >
                    <svelte:fragment slot="overflow">
                        <OverflowMenuItem text="New Database" on:click={sqliteDatabaseDialogNew} />
                        <OverflowMenuItem
                            text="Close Database"
                            danger
                            on:click={resetConnection}
                            disabled={$dbSqlitePath.baseName === ''}
                        />
                    </svelte:fragment>
                </FileSelector>
            </p>
        {/if}
    </DockableColumn>
</DockableRow>
