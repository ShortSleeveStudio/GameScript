<script lang="ts">
	// Export the dockable container
	export let container: HTMLDivElement;
</script>

<div bind:this={container}>
	<slot />
</div>
