<script lang="ts">
    /**
     * Name input for creating new rows with unique name validation.
     *
     * Unlike RowNameInput (for existing rows), this component:
     * - Validates against a UniqueNameTracker for new entries (id = -1)
     * - Binds directly to a value rather than a row view
     * - Is reactive to changes in the name tracker
     *
     * Features:
     * - Real-time unique name validation
     * - Visual feedback when name is not unique or empty
     * - Enter key support for submission
     * - Loading state handling
     */
    import type { UniqueNameTracker } from '$lib/stores/unique-name-tracker.js';
    import { onDestroy, onMount } from 'svelte';
    import type { Unsubscriber } from 'svelte/store';
    import Input from './Input.svelte';

    interface Props {
        /** The name value (bindable) */
        value?: string;
        /** Validation error message (bindable, null if valid) */
        error?: string | null;
        /** The UniqueNameTracker to validate against */
        nameTracker: UniqueNameTracker;
        /** Placeholder text for the input */
        placeholder?: string;
        /** Whether the input is disabled */
        disabled?: boolean;
        /** Whether to autofocus the input on mount */
        autofocus?: boolean;
        /** Callback when Enter is pressed with valid input */
        onsubmit?: () => void;
    }

    let {
        value = $bindable(''),
        error = $bindable(null),
        nameTracker,
        placeholder = 'Enter name...',
        disabled = false,
        autofocus = false,
        onsubmit,
    }: Props = $props();

    let inputElement: HTMLInputElement | undefined = $state();
    let trackerUnsubscriber: Unsubscriber;

    // Validate whenever tracker changes or value changes
    function validate(): void {
        error = nameTracker.validate(-1, value);
    }

    onMount(() => {
        // Subscribe to tracker changes for reactivity
        trackerUnsubscriber = nameTracker.changed.subscribe(() => {
            validate();
        });

        // Initial validation
        validate();

        // Handle autofocus
        if (autofocus && inputElement) {
            inputElement.focus();
        }
    });

    onDestroy(() => {
        trackerUnsubscriber?.();
    });

    // Validate on value change
    $effect(() => {
        if (nameTracker) {
            error = nameTracker.validate(-1, value);
        }
    });

    function handleInput(): void {
        validate();
    }

    function handleKeydown(e: KeyboardEvent): void {
        if (e.key === 'Enter' && !error && value.trim()) {
            onsubmit?.();
        }
    }
</script>

<Input
    bind:inputElement
    type="text"
    bind:value
    {placeholder}
    {disabled}
    invalid={!!error}
    oninput={handleInput}
    onkeydown={handleKeydown}
/>
