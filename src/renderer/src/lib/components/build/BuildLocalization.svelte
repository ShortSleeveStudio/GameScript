<script lang="ts">
    import { IsLoadingStore } from '@lib/stores/utility/is-loading-store';
    import BuildLocalizationExport from './BuildLocalizationExport.svelte';
    import BuildLocalizationImport from './BuildLocalizationImport.svelte';

    const isLoading: IsLoadingStore = new IsLoadingStore();
</script>

<h2>Localization</h2>
<BuildLocalizationExport {isLoading} />
<BuildLocalizationImport {isLoading} />
