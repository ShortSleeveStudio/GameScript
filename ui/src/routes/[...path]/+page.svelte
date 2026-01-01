<script lang="ts">
  /**
   * Main application page.
   *
   * The [...path] catch-all route ensures this component renders for all paths
   * except /sidebar. The App component handles the Golden Layout dock with
   * all panel components.
   */
  import App from '$lib/components/app/App.svelte';
</script>

<App />
