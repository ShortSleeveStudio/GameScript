<script lang="ts">
    import { dbConnected } from '@lib/stores/settings/settings';
    import SearchTable from './SearchTable.svelte';
    import DockableContent from '../app/DockableContent.svelte';
    import DockableRow from '../app/DockableRow.svelte';
    import DockableColumn from '../app/DockableColumn.svelte';
</script>

<DockableContent minWidth={52 * 8}>
    <DockableRow>
        <DockableColumn>
            {#if $dbConnected}
                <SearchTable />
            {/if}
        </DockableColumn>
    </DockableRow>
</DockableContent>
