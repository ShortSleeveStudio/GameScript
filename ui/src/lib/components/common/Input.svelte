<script lang="ts">
    /**
     * Unified input component with consistent styling.
     *
     * Features:
     * - Text, number, and password input types
     * - Placeholder support
     * - Disabled state
     * - Invalid/error state styling
     * - Focus styling
     * - Full width by default
     * - Callback props for events
     */
    interface Props {
        /** Input type */
        type?: 'text' | 'number' | 'password';
        /** Current value (bindable) */
        value?: string | number;
        /** Placeholder text */
        placeholder?: string;
        /** Whether the input is disabled */
        disabled?: boolean;
        /** Whether the input is in an invalid/error state */
        invalid?: boolean;
        /** Minimum value for number inputs */
        min?: number | undefined;
        /** Maximum value for number inputs */
        max?: number | undefined;
        /** Step for number inputs */
        step?: number | string | undefined;
        /** Reference to the input element */
        inputElement?: HTMLInputElement | undefined;
        /** Event callbacks */
        oninput?: (event: Event) => void;
        onchange?: (event: Event) => void;
        onblur?: (event: FocusEvent) => void;
        onkeydown?: (event: KeyboardEvent) => void;
        onkeyup?: (event: KeyboardEvent) => void;
    }

    let {
        type = 'text',
        value = $bindable(''),
        placeholder = '',
        disabled = false,
        invalid = false,
        min = undefined,
        max = undefined,
        step = undefined,
        inputElement = $bindable(undefined),
        oninput,
        onchange,
        onblur,
        onkeydown,
        onkeyup,
    }: Props = $props();
</script>

{#if type === 'number'}
    <input
        bind:this={inputElement}
        class="input"
        class:invalid
        type="number"
        {disabled}
        {placeholder}
        {min}
        {max}
        {step}
        bind:value
        oninput={oninput}
        onchange={onchange}
        onblur={onblur}
        onkeydown={onkeydown}
        onkeyup={onkeyup}
    />
{:else if type === 'password'}
    <input
        bind:this={inputElement}
        class="input"
        class:invalid
        type="password"
        {disabled}
        {placeholder}
        bind:value
        oninput={oninput}
        onchange={onchange}
        onblur={onblur}
        onkeydown={onkeydown}
        onkeyup={onkeyup}
    />
{:else}
    <input
        bind:this={inputElement}
        class="input"
        class:invalid
        type="text"
        {disabled}
        {placeholder}
        bind:value
        oninput={oninput}
        onchange={onchange}
        onblur={onblur}
        onkeydown={onkeydown}
        onkeyup={onkeyup}
    />
{/if}

<style>
    .input {
        width: 100%;
        padding: 0.5rem;
        font-size: 0.875rem;
        line-height: 1.25rem;
        background: var(--gs-input-bg);
        border: 1px solid var(--gs-input-border);
        border-radius: 4px;
        color: var(--gs-input-fg);
        font-family: var(--gs-font-family);
        box-sizing: border-box;
    }

    .input:focus {
        outline: none;
        border-color: var(--gs-border-focus);
    }

    .input:disabled {
        opacity: 0.5;
        cursor: not-allowed;
    }

    .input.invalid {
        border-color: var(--gs-fg-error, #da1e28);
        background-color: var(--gs-bg-error, rgba(218, 30, 40, 0.1));
    }

    .input.invalid:focus {
        border-color: var(--gs-fg-error, #da1e28);
    }

    .input::placeholder {
        color: var(--gs-fg-tertiary, var(--gs-fg-secondary));
        opacity: 0.7;
    }

    /* Remove spinner buttons for number inputs */
    .input[type='number']::-webkit-outer-spin-button,
    .input[type='number']::-webkit-inner-spin-button {
        -webkit-appearance: none;
        margin: 0;
    }

    .input[type='number'] {
        appearance: textfield;
        -moz-appearance: textfield;
    }
</style>
