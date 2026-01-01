<script lang="ts">
    /**
     * A standardized field layout for inspector panels.
     *
     * Features:
     * - Uppercase label with consistent styling
     * - Optional tooltip for label with additional info
     * - Snippet for field content (RowColumn components, buttons, etc.)
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
    import type { Snippet } from 'svelte';
    import Tooltip from './Tooltip.svelte';

    interface Props {
        /** The label text displayed above the field */
        label: string;
        /** Optional tooltip text for additional context */
        tooltip?: string;
        /** Tooltip alignment */
        tooltipAlign?: 'start' | 'center' | 'end';
        /** Tooltip direction */
        tooltipDirection?: 'top' | 'bottom';
        /** Field content */
        children?: Snippet;
    }

    let {
        label,
        tooltip = '',
        tooltipAlign = 'start',
        tooltipDirection = 'top',
        children,
    }: Props = $props();
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
    {#if children}
        {@render children()}
    {/if}
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
