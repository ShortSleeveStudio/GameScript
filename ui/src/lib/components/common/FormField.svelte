<script lang="ts">
    /**
     * A standardized form field layout with label and error display.
     *
     * Features:
     * - Label above the field
     * - Optional error message display
     * - Consistent styling for modal forms
     * - Slot for field content (inputs, dropdowns, etc.)
     *
     * Usage:
     * <FormField label="Name" error={nameError}>
     *     <Input bind:value={name} />
     * </FormField>
     */

    /** The label text displayed above the field */
    export let label: string;
    /** Optional error message to display below the field */
    export let error: string | null = null;
    /** Optional ID for the input element (used for label's for attribute) */
    export let inputId: string = '';
</script>

<div class="form-field">
    {#if label}
        <label class="form-field-label" for={inputId || undefined}>{label}</label>
    {/if}
    <slot />
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
