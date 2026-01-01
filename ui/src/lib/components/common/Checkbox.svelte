<script lang="ts">
    /**
     * Unified checkbox component with consistent styling.
     *
     * Features:
     * - Custom styled checkbox with checkmark
     * - Optional label text
     * - Disabled state support
     * - Callback prop for change events
     */
    interface Props {
        checked?: boolean;
        disabled?: boolean;
        label?: string;
        onchange?: (checked: boolean) => void;
    }

    let {
        checked = false,
        disabled = false,
        label = '',
        onchange,
    }: Props = $props();

    function handleChange(event: Event): void {
        const target = event.target as HTMLInputElement;
        onchange?.(target.checked);
    }
</script>

<label class="checkbox" class:disabled>
    <input
        type="checkbox"
        {checked}
        {disabled}
        onchange={handleChange}
    />
    <span class="checkmark"></span>
    {#if label}
        <span class="label-text">{label}</span>
    {/if}
</label>

<style>
    .checkbox {
        display: inline-flex;
        align-items: center;
        cursor: pointer;
        position: relative;
        gap: 0.5rem;
        user-select: none;
    }

    .checkbox.disabled {
        cursor: not-allowed;
        opacity: 0.5;
    }

    .checkbox input {
        position: absolute;
        opacity: 0;
        cursor: pointer;
        height: 0;
        width: 0;
    }

    .checkmark {
        position: relative;
        height: 16px;
        width: 16px;
        background-color: var(--gs-bg-secondary);
        border: 1px solid var(--gs-border-primary);
        border-radius: 2px;
        flex-shrink: 0;
    }

    .checkbox:not(.disabled):hover .checkmark {
        border-color: var(--gs-fg-link);
    }

    .checkbox input:checked ~ .checkmark {
        background-color: var(--gs-fg-link);
        border-color: var(--gs-fg-link);
    }

    .checkmark:after {
        content: '';
        position: absolute;
        display: none;
        left: 5px;
        top: 1px;
        width: 4px;
        height: 8px;
        border: solid white;
        border-width: 0 2px 2px 0;
        transform: rotate(45deg);
    }

    .checkbox input:checked ~ .checkmark:after {
        display: block;
    }

    .label-text {
        font-size: 0.875rem;
        color: var(--gs-fg-primary);
    }
</style>
