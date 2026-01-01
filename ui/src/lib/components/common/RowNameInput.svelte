<script lang="ts">
    /**
     * Name input with unique name validation.
     *
     * Features:
     * - Two-way binding with row view
     * - Undo/redo support
     * - Loading state handling
     * - Real-time unique name validation
     * - Visual feedback when name is not unique
     *
     * Ported from GameScriptElectron (adapted for new UniqueNameTracker API).
     */
    import { type IDbRowView } from '$lib/db';
    import type { Row, Named } from '@gamescript/shared';
    import { IsLoadingStore } from '$lib/stores/is-loading.js';
    import { wasSavePressed, wasEnterPressed } from '$lib/utils/keybinding.js';
    import { common } from '$lib/crud';
    import type { UniqueNameTracker } from '$lib/stores/unique-name-tracker.js';
    import { onDestroy, onMount } from 'svelte';
    import type { Unsubscriber } from 'svelte/store';
    import type { Writable } from 'svelte/store';
    import { get as getStore } from 'svelte/store';

    interface Props {
        rowView: IDbRowView<Row & Named>;
        undoText: string;
        inputPlaceholder: string;
        uniqueNameTracker?: UniqueNameTracker | undefined;
        isInspectorField?: boolean;
        isNameLocked?: Writable<boolean> | undefined;
    }

    let {
        rowView,
        undoText,
        inputPlaceholder,
        uniqueNameTracker = undefined,
        isInspectorField = false,
        isNameLocked = undefined,
    }: Props = $props();

    const isLoading = new IsLoadingStore();
    // svelte-ignore state_referenced_locally
    let boundValue: string = $state(rowView.data.name);
    // svelte-ignore state_referenced_locally
    let currentValue: string = $state(rowView.data.name);
    let isUnique: boolean = $state(true);
    let namesStoreUnsubscriber: Unsubscriber | undefined;

    onMount(() => {
        // Subscribe to changes in unique name tracker (if provided)
        if (uniqueNameTracker) {
            namesStoreUnsubscriber = uniqueNameTracker.changed.subscribe(() => {
                isUnique = uniqueNameTracker!.isUnique(rowView.id, boundValue);
            });

            // Add name initially (NOTE: order here matters - must be after subscription)
            if (!isInspectorField) {
                uniqueNameTracker.addName(rowView.id, rowView.data.name);
            }
        }
    });

    // Sync when external changes occur
    $effect(() => {
        const row = rowView.data;
        // If the name of this row has changed externally, update tracking and local state
        if (row.name !== currentValue) {
            if (!isInspectorField && uniqueNameTracker) {
                uniqueNameTracker.updateName(rowView.id, row.name);
            }
            boundValue = row.name;
            currentValue = row.name;
        }
    });

    // Update validation when bound value changes (while typing)
    $effect(() => {
        isUnique = uniqueNameTracker ? uniqueNameTracker.isUnique(rowView.id, boundValue) : true;
    });

    onDestroy(() => {
        if (!isInspectorField && uniqueNameTracker) {
            // Remove name from tracker
            uniqueNameTracker.removeName(rowView.id);
        }

        // Unsubscribe
        if (namesStoreUnsubscriber) namesStoreUnsubscriber();
    });

    async function syncOnBlur(): Promise<void> {
        const newValue = boundValue;
        const oldValue = currentValue;
        if (oldValue === newValue) return;

        // Update column with undo support
        const oldRow = { ...rowView.getValue() };
        const newRow = { ...oldRow, name: newValue };
        await isLoading.wrapPromise(
            common.updateOne(rowView.tableType, oldRow, newRow, `${undoText} change`)
        );
        currentValue = newValue;

        // Update tracker
        if (!isInspectorField && uniqueNameTracker) {
            uniqueNameTracker.updateName(rowView.id, newValue);
        }
    }

    function onKeyUp(e: KeyboardEvent): void {
        if (wasSavePressed(e) || wasEnterPressed(e)) {
            (e.target as HTMLElement).blur();
        }
    }

    // Derive locked state from isNameLocked store
    let isLocked = $derived(isNameLocked ? getStore(isNameLocked) : false);
</script>

<span class="defeat-form-requirement">
    <input
        class="row-name-input"
        class:invalid={!isUnique}
        type="text"
        disabled={isLocked || $isLoading}
        placeholder={inputPlaceholder}
        bind:value={boundValue}
        onblur={syncOnBlur}
        onkeyup={onKeyUp}
    />
</span>

<style>
    .row-name-input {
        width: 100%;
        padding: 0.25rem 0.5rem;
        font-size: 0.875rem;
        line-height: 1.25rem;
        background: var(--gs-bg-primary);
        border: 1px solid var(--gs-border-primary);
        border-radius: 4px;
        color: var(--gs-fg-primary);
    }

    .row-name-input:focus {
        outline: none;
        border-color: var(--gs-fg-link);
    }

    .row-name-input:disabled {
        opacity: 0.5;
        cursor: not-allowed;
    }

    .row-name-input.invalid {
        border-color: var(--gs-fg-error, #da1e28);
        background-color: var(--gs-bg-error, rgba(218, 30, 40, 0.1));
    }

    .row-name-input.invalid:focus {
        border-color: var(--gs-fg-error, #da1e28);
    }

    .defeat-form-requirement {
        display: block;
        width: 100%;
    }
</style>
