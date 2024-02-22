<script lang="ts">
    import { dbConnected } from '@lib/stores/settings/settings';
    import LocalizationEditorGrid from './LocalizationEditorGrid.svelte';
    import DockableContent from '../app/DockableContent.svelte';
    import DockableRow from '../app/DockableRow.svelte';
    import DockableColumn from '../app/DockableColumn.svelte';
</script>

<DockableContent>
    <DockableRow>
        <DockableColumn>
            {#if $dbConnected}
                <LocalizationEditorGrid />
            {/if}
        </DockableColumn>
    </DockableRow>
</DockableContent>
