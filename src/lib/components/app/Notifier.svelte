<script lang="ts">
    import { type Notification, notification } from '@lib/stores/app/notifications';
    import { durationModerate02 } from '@lib/motion/motion';
    import { fade } from 'svelte/transition';
    import { InlineNotification } from 'carbon-components-svelte';
    import { onDestroy } from 'svelte';

    let currentTimeout: number;
    onDestroy(
        notification.subscribe((newNotification: Notification) => {
            // New notification
            if (newNotification) {
                // Attempt to clear any old timeouts
                clearTimeout(currentTimeout);

                // Set new timeout
                currentTimeout = setTimeout(newNotification.close, newNotification.timeoutMs);
            }
        }),
    );
</script>

<div class="notification-container">
    {#if $notification}
        <span class="notification-item" transition:fade={{ duration: durationModerate02 }}>
            <InlineNotification
                kind={$notification.kind}
                title={$notification.title}
                subtitle={$notification.subtitle}
                lowContrast={$notification.lowContrast}
                hideCloseButton={true}
                on:close={$notification.close}
            />
        </span>
    {/if}
</div>

<style>
    .notification-container {
        position: fixed;
        display: flex;
        flex-direction: column;
        flex-wrap: nowrap;
        justify-content: flex-start;
        align-items: flex-end;
        justify-self: flex-start;
        align-self: end;
    }

    .notification-item {
        pointer-events: auto;
    }
</style>
