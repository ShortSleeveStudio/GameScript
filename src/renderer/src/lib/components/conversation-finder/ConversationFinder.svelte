<script lang="ts">
    import ConversationFinderGrid from './ConversationFinderGrid.svelte';
    import { dbConnected } from '@lib/stores/settings/settings';
    import DockableContent from '../app/DockableContent.svelte';
    import DockableRow from '../app/DockableRow.svelte';
    import DockableColumn from '../app/DockableColumn.svelte';
</script>

<DockableContent minWidth={52 * 8}>
    <DockableRow>
        <DockableColumn>
            {#if $dbConnected}
                <ConversationFinderGrid />
            {/if}
        </DockableColumn>
    </DockableRow>
</DockableContent>
