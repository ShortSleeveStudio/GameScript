<script lang="ts">
    import Topbar from '@lib/components/app/Topbar.svelte';
    import Overlay from '@lib/components/app/Overlay.svelte';
    import Dock from '@lib/components/app/Dock.svelte';
    import { ToastItem, toastManager } from '@lib/stores/app/toasts';
    import { onDestroy } from 'svelte';
    import { appInitializationErrors } from '@lib/stores/app/initialization-errors';
    import type { Unsubscriber } from 'svelte/store';
    import type { IpcRendererEvent } from 'electron';

    let initializationErrorSubscriber: Unsubscriber;

    function toErrorEvent(event: unknown): Error {
        if (typeof event === 'object') {
            if ('error' in event) {
                if (<Error>(<ErrorEvent>event).error) {
                    return <Error>(<ErrorEvent>event).error;
                } else if ('message' in <ErrorEvent>event) {
                    return new Error((<ErrorEvent>event)['message']);
                }
            } else if ('reason' in event) {
                const rejection: PromiseRejectionEvent = <PromiseRejectionEvent>event;
                return new Error(rejection.reason.message);
            }
            return new Error(`${event}`);
        } else if (typeof event === 'string') {
            return new Error(event);
        } else {
            return new Error(`Error: ${event}`);
        }
    }

    function globalErrorHandler(event: unknown): void {
        const error = toErrorEvent(event);
        toastManager.showToast(new ToastItem('error', error.message));
        console.log('remember to disable this');
        throw event;
    }

    // Subscribe to errors
    const backendErrorHandler: (_: IpcRendererEvent, error: string) => void = (
        _: IpcRendererEvent,
        error: string,
    ) => {
        globalErrorHandler(error);
    };
    window.onerror = globalErrorHandler;
    window.onunhandledrejection = globalErrorHandler;
    window.api.system.onErrorRegister(backendErrorHandler);
    initializationErrorSubscriber = appInitializationErrors.subscribe((errors: Error[]) => {
        if (errors.length > 0) {
            errors.forEach((err: Error) => {
                window.onerror(<ErrorEvent>{ error: err });
            });
            errors.length = 0;
            appInitializationErrors.set(errors);
        }
    });

    onDestroy(() => {
        if (initializationErrorSubscriber) initializationErrorSubscriber();
        window.onerror = undefined;
        window.onunhandledrejection = undefined;
        window.api.system.onErrorUnregister(backendErrorHandler);
    });
</script>

<Topbar />
<Overlay />
<Dock />
