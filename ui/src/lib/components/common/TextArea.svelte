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
     * - Callbacks: oninput, onchange, onblur, onkeydown, onkeyup
     */
    import { onMount } from 'svelte';

    interface Props {
        /** Current value */
        value?: string;
        /** Placeholder text */
        placeholder?: string;
        /** Whether the textarea is disabled */
        disabled?: boolean;
        /** Whether the textarea is in an invalid/error state */
        invalid?: boolean;
        /** Number of visible rows */
        rows?: number;
        /** Whether to auto-resize based on content */
        autoResize?: boolean;
        /** Reference to the textarea element */
        textareaElement?: HTMLTextAreaElement;
        /** Callback on input */
        oninput?: (event: Event) => void;
        /** Callback on change */
        onchange?: (event: Event) => void;
        /** Callback on blur */
        onblur?: (event: FocusEvent) => void;
        /** Callback on keydown */
        onkeydown?: (event: KeyboardEvent) => void;
        /** Callback on keyup */
        onkeyup?: (event: KeyboardEvent) => void;
    }

    let {
        value = $bindable(''),
        placeholder = '',
        disabled = false,
        invalid = false,
        rows = 3,
        autoResize = false,
        textareaElement = $bindable(),
        oninput,
        onchange,
        onblur,
        onkeydown,
        onkeyup,
    }: Props = $props();

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
        oninput?.(event);
    }

    function handleChange(event: Event): void {
        onchange?.(event);
    }

    function handleBlur(event: FocusEvent): void {
        onblur?.(event);
    }

    function handleKeydown(event: KeyboardEvent): void {
        onkeydown?.(event);
    }

    function handleKeyup(event: KeyboardEvent): void {
        if (autoResize) resize();
        onkeyup?.(event);
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
    oninput={handleInput}
    onchange={handleChange}
    onblur={handleBlur}
    onkeydown={handleKeydown}
    onkeyup={handleKeyup}
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
