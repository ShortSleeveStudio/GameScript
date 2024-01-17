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
    import { type DropdownItem } from 'carbon-components-svelte/src/Dropdown/Dropdown.svelte';
    import { DATABASE_TYPES, type DatabaseType } from '@lib/api/db/db-types';
    import { OverflowMenuVertical } from 'carbon-icons-svelte';
    import type { DialogResult } from 'preload/api-dialog';
    import { dialogResultReset } from '@lib/utility/dialog';

    // Database type dropdown
    const databaseOptions: DropdownItem[] = DATABASE_TYPES.map(
        (dbType: DatabaseType) =>
            <DropdownItem>{
                id: dbType.name,
                text: dbType.name,
            },
    );

    async function sqliteDatabaseDialogNew() {
        const saveResult: DialogResult = await window.api.dialog.sqliteDbSave();
        if (saveResult.cancelled) return;
        $dbSqlitePath = saveResult;
    }

    async function sqliteDatabaseDialogOpen() {
        const openResult: DialogResult = await window.api.dialog.sqliteDbOpen();
        if (openResult.cancelled) return;
        $dbSqlitePath = openResult;
    }

    function resetConnection() {
        dbSqlitePath.update(dialogResultReset);
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
                        value={$dbSqlitePath.baseName}
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
                        <OverflowMenuItem
                            text="Close Database"
                            danger
                            on:click={resetConnection}
                            disabled={$dbSqlitePath.baseName === ''}
                        />
                    </OverflowMenu>
                </span>
            </p>
        {/if}
    </Column>
</Row>
