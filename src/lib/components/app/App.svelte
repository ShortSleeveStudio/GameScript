<script lang="ts">
    import Topbar from '@lib/components/app/Topbar.svelte';
    import Dock from '@lib/components/app/Dock.svelte';
    import Overlay from '@lib/components/app/Overlay.svelte';
    import { ToastItem, toastManager } from '@lib/stores/app/toasts';

    function globalErrorHandler(event: unknown) {
        console.log(event);
        toastManager.showToast(new ToastItem('error', (<ErrorEvent>event).error.message));
    }
    console.log('remember to renaable error');
</script>

<!-- <svelte:window on:error|preventDefault|stopPropagation={globalErrorHandler} /> -->
<Topbar />
<Overlay />
<Dock />
