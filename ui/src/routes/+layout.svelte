<script lang="ts">
  // Import global theme CSS variables
  import '$lib/styles/theme.css';
  // Import Golden Layout CSS
  import '$lib/styles/golden-layout-base-custom.css';
  import '$lib/styles/golden-layout-theme-custom.css';
  // Import AG Grid CSS
  import '@ag-grid-community/styles/ag-grid.css';
  import '@ag-grid-community/styles/ag-theme-quartz.css';
  // Import Svelte Flow CSS
  import '@xyflow/svelte/dist/style.css';

  import type { Snippet } from 'svelte';

  interface Props {
    children?: Snippet;
  }

  let { children }: Props = $props();
</script>

{#if children}
  {@render children()}
{/if}
