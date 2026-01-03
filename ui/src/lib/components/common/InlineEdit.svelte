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
     *     onsave={(newValue) => handleRename(item.id, newValue)}
     * />
     * ```
     */

    import { tick } from 'svelte';

    interface Props {
        /** Current text value */
        value?: string;
        /** Placeholder shown when value is empty */
        placeholder?: string;
        /** Whether to start editing on single click (vs double-click) */
        editOnClick?: boolean;
        /** Whether the component is disabled */
        disabled?: boolean;
        /** Tooltip text */
        title?: string;
        /** Callback when value is saved */
        onsave?: (value: string) => void;
        /** Callback when editing is cancelled */
        oncancel?: () => void;
    }

    let {
        value = '',
        placeholder = '',
        editOnClick = false,
        disabled = false,
        title = 'Double-click to edit',
        onsave,
        oncancel,
    }: Props = $props();

    let editing = $state(false);
    let editValue = $state('');
    let inputElement: HTMLInputElement | undefined = $state();

    async function startEditing(): Promise<void> {
        if (disabled) return;
        editing = true;
        editValue = value;
        await tick();
        inputElement?.focus();
        inputElement?.select();
    }

    function save(): void {
        // Guard: only save if we're still editing (prevents double-save from Enter + blur)
        if (!editing) return;
        editing = false;
        if (editValue !== value) {
            onsave?.(editValue);
        }
    }

    function cancel(): void {
        editing = false;
        editValue = value;
        oncancel?.();
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
        onblur={handleBlur}
        onkeydown={handleKeydown}
    />
{:else}
    <button
        type="button"
        class="inline-edit-text"
        class:inline-edit-placeholder={!value}
        class:inline-edit-disabled={disabled}
        title={disabled ? '' : title}
        {disabled}
        onclick={handleClick}
        ondblclick={handleDblClick}
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
