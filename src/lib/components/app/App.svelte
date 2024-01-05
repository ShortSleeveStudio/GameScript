<script lang="ts">
    import Topbar from '@lib/components/app/Topbar.svelte';
    import Dock from '@lib/components/app/Dock.svelte';
    import Overlay from '@lib/components/app/Overlay.svelte';
    import { ToastItem, toastManager } from '@lib/stores/app/toasts';
    import { onDestroy } from 'svelte';
    import { appInitializationErrors } from '@lib/stores/app/initialization-errors';

    function toErrorEvent(event: Event | string): Error {
        if (typeof event === 'object' && 'error' in event) {
            return <Error>(<ErrorEvent>event).error;
        } else if (typeof event === 'string') {
            return new Error(event);
        } else {
            return new Error(`Error: ${event}`);
        }
    }

    function globalErrorHandler(event: Event | string) {
        const error = toErrorEvent(event);
        toastManager.showToast(new ToastItem('error', error.message));
        console.log('remember to disable this');
        throw event;
    }

    onDestroy(
        appInitializationErrors.subscribe((errors: Error[]) => {
            if (errors.length > 0) {
                errors.forEach((err: Error) => {
                    console.log('test');
                    globalErrorHandler(<ErrorEvent>{ error: err });
                });
                errors.length = 0;
                appInitializationErrors.set(errors);
            }
        }),
    );
</script>

<svelte:window on:error|preventDefault|stopPropagation={globalErrorHandler} />
<Topbar />
<Overlay />
<Dock />
