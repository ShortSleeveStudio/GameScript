<script lang="ts">
    /**
     * A standardized settings section layout with title and optional description.
     *
     * Features:
     * - Uppercase title with border underline
     * - Optional description text
     * - Slot for section content
     * - Consistent spacing and styling
     *
     * Usage:
     * <SettingsSection title="Layout Defaults" description="These settings control...">
     *     <SettingRow ... />
     * </SettingsSection>
     */

    /** The section title displayed as an uppercase header */
    export let title: string;
    /** Optional description text below the title */
    export let description: string = '';
</script>

<div class="settings-section">
    <h2 class="settings-section-title">{title}</h2>
    {#if description}
        <p class="settings-section-description">{description}</p>
    {/if}
    <slot />
</div>

<style>
    .settings-section {
        margin-bottom: 24px;
    }

    .settings-section-title {
        font-size: 12px;
        font-weight: 600;
        text-transform: uppercase;
        color: var(--gs-fg-secondary);
        margin: 0 0 12px 0;
        padding-bottom: 8px;
        border-bottom: 1px solid var(--gs-border-primary);
    }

    .settings-section-description {
        font-size: var(--gs-font-size-small);
        color: var(--gs-fg-secondary);
        margin: 0 0 12px 0;
        line-height: 1.4;
    }
</style>
