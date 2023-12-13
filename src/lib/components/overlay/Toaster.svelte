<script lang="ts">
	import { ToastNotification } from 'carbon-components-svelte';
	import { toasts } from '@lib/stores/toasts';
	import { fly, slide } from 'svelte/transition';
	import { flip } from 'svelte/animate';
	import { durationModerate02 } from '@lib/motion/motion';
</script>

<div class="toast-container">
	{#each $toasts as toast (toast.id)}
		<span
			class="toast-item"
			animate:flip={{ duration: durationModerate02 }}
			in:slide={{ duration: durationModerate02, axis: 'x' }}
			out:fly={{ x: '100%', duration: durationModerate02 }}
		>
			<ToastNotification
				kind={toast.kind}
				title={toast.title}
				subtitle={toast.subtitle}
				caption={toast.caption}
				on:close={toast.close}
			/>
		</span>
	{/each}
</div>

<style>
	.toast-container {
		position: fixed;
		display: flex;
		flex-direction: column;
		flex-wrap: nowrap;
		justify-content: flex-start;
		align-items: flex-end;
		justify-self: flex-end;
	}

	.toast-item {
		pointer-events: auto;
	}
</style>
