<script lang="ts">
    import { IsLoadingStore } from '@lib/stores/utility/is-loading-store';
    import BuildGameExport from './BuildGameExport.svelte';
    import BuildGameImport from './BuildGameImport.svelte';

    const isLoading: IsLoadingStore = new IsLoadingStore();
</script>

<h2>Game</h2>
<BuildGameExport {isLoading} />
<BuildGameImport {isLoading} />
