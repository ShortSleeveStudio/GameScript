<script lang="ts">
	import Topbar from '@lib/components/app/Topbar.svelte';
	import Container from '@lib/components/app/Container.svelte';
	import Overlay from '@lib/components/app/Overlay.svelte';
	import { ToastItem, showToast } from '@lib/stores/toasts';

	function globalErrorHandler(event: unknown) {
		console.log(event);
		showToast(
			new ToastItem(
				'error',
				'Error',
				(<ErrorEvent>event).error.message,
				new Date().toLocaleString(),
			),
		);
	}
	console.log('remember to renaable error');
</script>

<!-- <svelte:window on:error|preventDefault|stopPropagation={globalErrorHandler} /> -->
<Topbar />
<Overlay />
<Container />
