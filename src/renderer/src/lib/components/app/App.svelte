<script lang="ts">
    import Topbar from '@lib/components/app/Topbar.svelte';
    import Overlay from '@lib/components/app/Overlay.svelte';
    import Dock from '@lib/components/app/Dock.svelte';
    import { ToastItem, toastManager } from '@lib/stores/app/toasts';
    import { onDestroy } from 'svelte';
    import { appInitializationErrors } from '@lib/stores/app/initialization-errors';
    import type { Unsubscriber } from 'svelte/store';
    import type { IpcRendererEvent } from 'electron';
    import { db } from '@lib/api/db/db';

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
            } else if ('stack' in event && 'message' in event) {
                return <Error>event;
            }
            return new Error(`${event}`);
        } else if (typeof event === 'string') {
            return new Error(event);
        } else {
            return new Error(`Error: ${event}`);
        }
    }

    function globalErrorHandler(event: unknown): boolean {
        const error = toErrorEvent(event);
        toastManager.showToast(
            new ToastItem(
                'error',
                error.message,
                `Name: ${error.name}\n` +
                    `Message: ${error.message}\n` +
                    `Cause: ${error.cause}\n` +
                    `Stack: ${error.stack}`,
                undefined,
                'Click this message to copy error to clipboard',
            ),
        );
        return true;
    }

    const backendErrorHandler: (_: IpcRendererEvent, error: string) => void = (
        _: IpcRendererEvent,
        error: string,
    ) => {
        globalErrorHandler(error);
        void db?.disconnect();
    };
    const frontendErrorHandler: (event: Event) => void = (event: Event) => {
        event.preventDefault();
        event.stopImmediatePropagation();
        globalErrorHandler(event);
    };

    // Subscribe to errors
    addEventListener('error', frontendErrorHandler);
    addEventListener('onunhandledrejection', frontendErrorHandler);
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
        removeEventListener('error', frontendErrorHandler);
        removeEventListener('onunhandledrejection', frontendErrorHandler);
        window.api.system.onErrorUnregister(backendErrorHandler);
    });
</script>

<Topbar />
<Overlay />
<Dock />
