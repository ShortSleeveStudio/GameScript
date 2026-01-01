<script lang="ts">
    /**
     * A standardized field layout for inspector panels.
     *
     * Features:
     * - Uppercase label with consistent styling
     * - Optional tooltip for label with additional info
     * - Slot for field content (RowColumn components, buttons, etc.)
     *
     * Usage:
     * <InspectorField label="Name">
     *     <RowColumnInput {rowView} ... />
     * </InspectorField>
     *
     * With tooltip:
     * <InspectorField label="Voice Text" tooltip="This is the localized text...">
     *     <RowColumnLocalization {rowView} ... />
     * </InspectorField>
     */
    import Tooltip from './Tooltip.svelte';

    /** The label text displayed above the field */
    export let label: string;
    /** Optional tooltip text for additional context */
    export let tooltip: string = '';
    /** Tooltip alignment */
    export let tooltipAlign: 'start' | 'center' | 'end' = 'start';
    /** Tooltip direction */
    export let tooltipDirection: 'top' | 'bottom' = 'top';
</script>

<div class="inspector-field">
    <div class="inspector-field-label">
        {#if tooltip}
            <Tooltip triggerText={label} align={tooltipAlign} direction={tooltipDirection}>
                <p>{tooltip}</p>
            </Tooltip>
        {:else}
            <span>{label}</span>
        {/if}
    </div>
    <slot />
</div>

<style>
    .inspector-field {
        margin: 0 0 0.75rem 0;
    }

    .inspector-field-label {
        margin-bottom: 0.25rem;
        font-size: 0.75rem;
        color: var(--gs-fg-secondary);
        text-transform: uppercase;
        letter-spacing: 0.05em;
    }
</style>
