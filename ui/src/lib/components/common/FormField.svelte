<script lang="ts">
    /**
     * A standardized form field layout with label and error display.
     *
     * Features:
     * - Label above the field
     * - Optional error message display
     * - Consistent styling for modal forms
     * - Snippet for field content (inputs, dropdowns, etc.)
     *
     * Usage:
     * <FormField label="Name" error={nameError}>
     *     <Input bind:value={name} />
     * </FormField>
     */
    import type { Snippet } from 'svelte';

    interface Props {
        /** The label text displayed above the field */
        label: string;
        /** Optional error message to display below the field */
        error?: string | null;
        /** Optional ID for the input element (used for label's for attribute) */
        inputId?: string;
        /** Field content */
        children?: Snippet;
    }

    let {
        label,
        error = null,
        inputId = '',
        children,
    }: Props = $props();
</script>

<div class="form-field">
    {#if label}
        <label class="form-field-label" for={inputId || undefined}>{label}</label>
    {/if}
    {#if children}
        {@render children()}
    {/if}
    {#if error}
        <p class="form-field-error">{error}</p>
    {/if}
</div>

<style>
    .form-field {
        display: flex;
        flex-direction: column;
        gap: 8px;
    }

    .form-field-label {
        font-weight: 500;
        color: var(--gs-fg-primary);
    }

    .form-field-error {
        color: var(--gs-fg-error);
        font-size: var(--gs-font-size-small);
        margin: 0;
    }
</style>
