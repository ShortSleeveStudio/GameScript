<script lang="ts">
    /**
     * Unified textarea component with consistent styling.
     *
     * Features:
     * - Placeholder support
     * - Disabled state
     * - Invalid/error state styling
     * - Focus styling
     * - Auto-resize option
     * - Configurable rows
     * - Full width by default
     * - Events: input, change, blur, keydown, keyup
     */
    import { createEventDispatcher, onMount } from 'svelte';

    /** Current value */
    export let value: string = '';
    /** Placeholder text */
    export let placeholder: string = '';
    /** Whether the textarea is disabled */
    export let disabled: boolean = false;
    /** Whether the textarea is in an invalid/error state */
    export let invalid: boolean = false;
    /** Number of visible rows */
    export let rows: number = 3;
    /** Whether to auto-resize based on content */
    export let autoResize: boolean = false;
    /** Reference to the textarea element */
    export let textareaElement: HTMLTextAreaElement | undefined = undefined;

    const dispatch = createEventDispatcher<{
        input: Event;
        change: Event;
        blur: FocusEvent;
        keydown: KeyboardEvent;
        keyup: KeyboardEvent;
    }>();

    function resize(): void {
        if (autoResize && textareaElement) {
            textareaElement.style.height = 'auto';
            textareaElement.style.height = textareaElement.scrollHeight + 'px';
        }
    }

    onMount(() => {
        if (autoResize) {
            resize();
        }
    });

    function handleInput(event: Event): void {
        if (autoResize) resize();
        dispatch('input', event);
    }

    function handleChange(event: Event): void {
        dispatch('change', event);
    }

    function handleBlur(event: FocusEvent): void {
        dispatch('blur', event);
    }

    function handleKeydown(event: KeyboardEvent): void {
        dispatch('keydown', event);
    }

    function handleKeyup(event: KeyboardEvent): void {
        if (autoResize) resize();
        dispatch('keyup', event);
    }
</script>

<textarea
    bind:this={textareaElement}
    class="textarea"
    class:invalid
    {disabled}
    {placeholder}
    {rows}
    bind:value
    on:input={handleInput}
    on:change={handleChange}
    on:blur={handleBlur}
    on:keydown={handleKeydown}
    on:keyup={handleKeyup}
></textarea>

<style>
    .textarea {
        width: 100%;
        padding: 0.5rem;
        font-size: 0.875rem;
        line-height: 1.4;
        background: var(--gs-input-bg);
        border: 1px solid var(--gs-input-border);
        border-radius: 4px;
        color: var(--gs-input-fg);
        font-family: var(--gs-font-family);
        resize: vertical;
        box-sizing: border-box;
    }

    .textarea:focus {
        outline: none;
        border-color: var(--gs-border-focus);
    }

    .textarea:disabled {
        opacity: 0.5;
        cursor: not-allowed;
    }

    .textarea.invalid {
        border-color: var(--gs-fg-error, #da1e28);
        background-color: var(--gs-bg-error, rgba(218, 30, 40, 0.1));
    }

    .textarea.invalid:focus {
        border-color: var(--gs-fg-error, #da1e28);
    }

    .textarea::placeholder {
        color: var(--gs-fg-tertiary, var(--gs-fg-secondary));
        opacity: 0.7;
    }
</style>
