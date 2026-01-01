<script lang="ts">
    /**
     * InlineEdit component for editable text that looks like plain text.
     *
     * Displays text normally, but becomes an input on interaction.
     * Supports:
     * - Double-click to edit (default)
     * - Single-click to edit (optional)
     * - Enter to save, Escape to cancel
     * - Blur to save
     * - Placeholder text when empty
     *
     * Usage:
     * ```svelte
     * <InlineEdit
     *     value={item.name}
     *     on:save={({ detail }) => handleRename(item.id, detail)}
     * />
     * ```
     */

    import { createEventDispatcher, tick } from 'svelte';

    /** Current text value */
    export let value: string = '';

    /** Placeholder shown when value is empty */
    export let placeholder: string = '';

    /** Whether to start editing on single click (vs double-click) */
    export let editOnClick: boolean = false;

    /** Whether the component is disabled */
    export let disabled: boolean = false;

    /** Tooltip text */
    export let title: string = 'Double-click to edit';

    const dispatch = createEventDispatcher<{
        save: string;
        cancel: void;
    }>();

    let editing = false;
    let editValue = '';
    let inputElement: HTMLInputElement;

    async function startEditing(): Promise<void> {
        if (disabled) return;
        editing = true;
        editValue = value;
        await tick();
        inputElement?.focus();
        inputElement?.select();
    }

    function save(): void {
        if (editValue !== value) {
            dispatch('save', editValue);
        }
        editing = false;
    }

    function cancel(): void {
        editing = false;
        editValue = value;
        dispatch('cancel');
    }

    function handleKeydown(event: KeyboardEvent): void {
        if (event.key === 'Enter') {
            event.preventDefault();
            save();
        } else if (event.key === 'Escape') {
            event.preventDefault();
            cancel();
        }
    }

    function handleBlur(): void {
        save();
    }

    function handleClick(): void {
        if (editOnClick) {
            startEditing();
        }
    }

    function handleDblClick(): void {
        if (!editOnClick) {
            startEditing();
        }
    }
</script>

{#if editing}
    <input
        type="text"
        class="inline-edit-input"
        bind:value={editValue}
        bind:this={inputElement}
        on:blur={handleBlur}
        on:keydown={handleKeydown}
    />
{:else}
    <button
        type="button"
        class="inline-edit-text"
        class:inline-edit-placeholder={!value}
        class:inline-edit-disabled={disabled}
        title={disabled ? '' : title}
        {disabled}
        on:click={handleClick}
        on:dblclick={handleDblClick}
    >
        {value || placeholder}
    </button>
{/if}

<style>
    .inline-edit-text {
        display: block;
        width: 100%;
        text-align: left;
        font-size: 12px;
        font-family: inherit;
        cursor: pointer;
        padding: 2px 4px;
        border-radius: 2px;
        background: transparent;
        border: none;
        color: inherit;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
    }

    .inline-edit-text:hover:not(:disabled) {
        background: var(--gs-list-hover-bg);
    }

    .inline-edit-placeholder {
        color: var(--gs-fg-secondary);
        font-style: italic;
    }

    .inline-edit-disabled {
        cursor: default;
        opacity: 0.6;
    }

    .inline-edit-input {
        width: 100%;
        font-size: 12px;
        font-family: inherit;
        padding: 2px 4px;
        background: var(--gs-input-bg);
        color: var(--gs-input-fg);
        border: 1px solid var(--gs-input-border);
        border-radius: 2px;
        outline: none;
    }

    .inline-edit-input:focus {
        border-color: var(--gs-border-focus);
    }
</style>
