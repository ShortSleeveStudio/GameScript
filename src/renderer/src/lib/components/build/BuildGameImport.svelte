<script lang="ts">
    import type { IsLoadingStore } from '@lib/stores/utility/is-loading-store';
    import { Tile } from 'carbon-components-svelte';

    export let isLoading: IsLoadingStore;
</script>

<Tile><h3>Import</h3></Tile>
