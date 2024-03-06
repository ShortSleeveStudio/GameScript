<script lang="ts">
    import { dbConnected } from '@lib/stores/settings/settings';
    import ConversationEditorGraph from './ConversationEditorGraph.svelte';
    import { SvelteFlowProvider } from '@xyflow/svelte';
    import DockableContent from '../app/DockableContent.svelte';
    import DockableRow from '../app/DockableRow.svelte';
    import DockableColumn from '../app/DockableColumn.svelte';
</script>

<DockableContent minWidth={70 * 8}>
    <DockableRow>
        <DockableColumn>
            {#if $dbConnected}
                <SvelteFlowProvider>
                    <ConversationEditorGraph />
                </SvelteFlowProvider>
            {/if}
        </DockableColumn>
    </DockableRow>
</DockableContent>
