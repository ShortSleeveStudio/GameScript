<script lang="ts" module>
    /**
     * Dropdown option configuration.
     */
    export interface DropdownOption {
        /** Value for the option */
        value: string | number;
        /** Display label */
        label: string;
    }
</script>

<script lang="ts">
    /**
     * Standardized dropdown select component.
     *
     * Provides consistent styling for all dropdowns across the application.
     * Supports:
     * - Static options via `options` prop
     * - Dynamic options via default slot
     * - Size variants (default, small)
     * - Full width or auto width
     * - Disabled state
     */
    import type { Snippet } from 'svelte';

    interface Props {
        /** Static options to render */
        options?: DropdownOption[];
        /** Currently selected value (bindable) */
        value?: string | number;
        /** Whether the dropdown is disabled */
        disabled?: boolean;
        /** Size variant */
        size?: 'default' | 'small';
        /** Whether the dropdown should fill available width */
        fullWidth?: boolean;
        /** Optional title/tooltip */
        title?: string;
        /** Change callback */
        onchange?: (value: string | number) => void;
        /** Slot for custom options */
        children?: Snippet;
    }

    let {
        options = [],
        value = $bindable(''),
        disabled = false,
        size = 'default',
        fullWidth = true,
        title = '',
        onchange,
        children,
    }: Props = $props();

    function handleChange(event: Event): void {
        const target = event.target as HTMLSelectElement;
        const newValue = target.value;
        // Try to parse as number if it looks like one
        const parsedValue = /^-?\d+$/.test(newValue) ? parseInt(newValue, 10) : newValue;
        value = parsedValue;
        onchange?.(parsedValue);
    }
</script>

<select
    class="dropdown"
    class:dropdown-small={size === 'small'}
    class:dropdown-full-width={fullWidth}
    {value}
    {disabled}
    {title}
    onchange={handleChange}
>
    {#if options.length > 0}
        {#each options as option (option.value)}
            <option value={option.value}>{option.label}</option>
        {/each}
    {:else if children}
        {@render children()}
    {/if}
</select>

<style>
    .dropdown {
        padding: 4px 8px;
        font-size: var(--gs-font-size-small);
        font-family: inherit;
        background: var(--gs-dropdown-bg);
        color: var(--gs-dropdown-fg);
        border: 1px solid var(--gs-dropdown-border);
        border-radius: 2px;
        cursor: pointer;
        appearance: auto;
    }

    .dropdown-full-width {
        width: 100%;
    }

    .dropdown:focus {
        outline: none;
        border-color: var(--gs-border-focus);
    }

    .dropdown:disabled {
        opacity: 0.5;
        cursor: not-allowed;
    }

    .dropdown option {
        background: var(--gs-dropdown-bg);
        color: var(--gs-dropdown-fg);
    }

    /* Small size variant */
    .dropdown-small {
        padding: 2px 4px;
        font-size: var(--gs-font-size-small, 11px);
    }
</style>
