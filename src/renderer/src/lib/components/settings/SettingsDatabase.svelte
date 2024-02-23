<script lang="ts">
    import { dbSqlitePath, dbType } from '@lib/stores/settings/settings';
    import { Dropdown, OverflowMenuItem } from 'carbon-components-svelte';
    import type { DialogResult } from 'preload/api-dialog';
    import { dialogResultReset } from '@lib/utility/dialog';
    import FileSelector from '../common/FileSelector.svelte';
    import DockableRow from '../app/DockableRow.svelte';
    import DockableColumn from '../app/DockableColumn.svelte';
    import { DATABASE_TYPE_DROPDOWN_ITEMS, DATABASE_TYPE_SQLITE } from '@common/common-types';

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
            <Dropdown size="sm" bind:selectedId={$dbType} items={DATABASE_TYPE_DROPDOWN_ITEMS} />
        </p>
        {#if $dbType === DATABASE_TYPE_SQLITE.id}
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
