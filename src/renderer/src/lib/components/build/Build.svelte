<script lang="ts">
    import { dbConnected } from '@lib/stores/settings/settings';
    import BuildGame from './BuildGame.svelte';
    import BuildLocalization from './BuildLocalization.svelte';
    import DockableContent from '../app/DockableContent.svelte';
    import DockableRow from '../app/DockableRow.svelte';
    import DockableColumn from '../app/DockableColumn.svelte';
</script>

<DockableContent minWidth={52 * 8}>
    <DockableRow>
        <DockableColumn>
            {#if $dbConnected}
                <BuildGame />
                <BuildLocalization />
            {/if}
        </DockableColumn>
    </DockableRow>
</DockableContent>
