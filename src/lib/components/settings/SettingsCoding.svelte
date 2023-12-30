<script lang="ts">
    import {
        Button,
        Column,
        DataTable,
        InlineLoading,
        Row,
        Toolbar,
        ToolbarBatchActions,
        ToolbarContent,
    } from 'carbon-components-svelte';
    import CodingLanguageDropdown from './CodingLanguageDropdown.svelte';
    import { TrashCan } from 'carbon-icons-svelte';
    import { programmingLanguage } from '@lib/tables/programming-language';

    const headers = [
        { key: 'name', value: 'Name' },
        { key: 'isDefault', value: 'Default' },
    ];
    let selectedRowIds: number[] = [];
    let isLoading: boolean = false;

    const rows = [{ id: 0 }, { id: 1 }, { id: 3 }];

    async function addRow(): Promise<void> {
        console.log('add row');
    }

    async function deleteRows(): Promise<void> {
        console.log('delete rows');
        selectedRowIds = [];
    }
</script>

<Row>
    <Column>
        <h2>Coding</h2>
        <p>
            <sup>Programming Language</sup>
            {#if $programmingLanguage.length === 1}
                <CodingLanguageDropdown programmingLanguageNode={$programmingLanguage[0]} />
            {/if}
        </p>
        <DataTable
            size="medium"
            title="Default Routines"
            description="The routines listed in this table will be available to you in dropdown 
            menus that allow you to fill in code blocks with pre-written code. If you delete these, 
            places where they were used will no longer execute any code."
            batchSelection
            bind:selectedRowIds
            {headers}
            {rows}
        >
            <svelte:fragment slot="cell-header" let:header>
                {header.value}
            </svelte:fragment>

            <svelte:fragment slot="cell" let:row let:cell>
                {#if cell.key === 'name'}
                    name
                {:else if cell.key === 'isDefault'}
                    default
                {/if}
            </svelte:fragment>

            <Toolbar size="sm">
                <ToolbarBatchActions>
                    <Button icon={TrashCan} on:click={deleteRows}>Delete</Button>
                </ToolbarBatchActions>
                <ToolbarContent>
                    <Button
                        on:click={addRow}
                        disabled={isLoading}
                        icon={isLoading ? InlineLoading : undefined}>Add Routine</Button
                    >
                </ToolbarContent>
            </Toolbar>
        </DataTable>
    </Column>
</Row>
