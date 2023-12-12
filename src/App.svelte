<script lang="ts">
	import Topbar from '@lib/components/app/Topbar.svelte';
	import Container from '@lib/components/app/Container.svelte';
	import Overlay from '@lib/components/app/Overlay.svelte';
	import { ToastItem, showToast } from '@lib/stores/toasts';

	function globalErrorHandler(event: unknown) {
		let error = event as ErrorEvent;
		showToast(new ToastItem('error', 'Error', error.message, new Date().toLocaleString()));
	}
</script>

<svelte:window on:error|preventDefault|stopPropagation={globalErrorHandler} />
<Topbar />
<Overlay />
<Container />
