<script lang="ts">
    /**
     * Localization reference editor for a row column.
     *
     * Fetches and displays the localization entry referenced by a column
     * (e.g., node.voice_text or actor.localized_name).
     *
     * Features:
     * - Fetches localization by ID from the column value
     * - Embeds InspectorLocalization for editing
     * - Shows variant indicator when subject actor or gender override is configured
     * - Automatically cleans up table view subscription
     *
     * Ported from GameScriptElectron.
     */
    import { query, TABLE_LOCALIZATIONS, type IDbTableView } from '$lib/db';
    import type { Localization, Row } from '@gamescript/shared';
    import type { IDbRowView } from '$lib/db';
    import { common } from '$lib/crud';
    import { onDestroy, untrack } from 'svelte';
    import InspectorLocalization from '../inspector/InspectorLocalization.svelte';

    interface Props {
        rowView: IDbRowView<Row>;
        columnName: string;
        showTitle?: boolean;
        showId?: boolean;
        showNickname?: boolean;
        showFormMatrix?: boolean;
    }

    let {
        rowView,
        columnName,
        showTitle = false,
        showId = true,
        showNickname = true,
        showFormMatrix = true,
    }: Props = $props();

    let localizationTableView: IDbTableView<Localization> | undefined = $state();

    // Semantic signal: the localization ID we need to fetch
    let localizationId = $derived(rowView.data[columnName] as number | null);

    // Effect reacts only when localizationId changes
    $effect(() => {
        const id = localizationId;
        untrack(() => {
            // Release previous table view if it exists
            if (localizationTableView) {
                common.releaseTable(localizationTableView);
                localizationTableView = undefined;
            }

            // Fetch new table view if we have an ID
            if (id != null) {
                localizationTableView = common.fetchTable(
                    TABLE_LOCALIZATIONS,
                    query<Localization>().where('id').eq(id).build(),
                );
            }
        });
    });

    onDestroy(() => {
        if (localizationTableView) {
            common.releaseTable(localizationTableView);
        }
    });

    // Variant indicator: show when this localization has a subject actor or gender override configured
    let hasVariants = $derived.by(() => {
        if (!localizationTableView || localizationTableView.rows.length === 0) return false;
        const loc = localizationTableView.rows[0].data;
        return loc.subject_actor !== null || loc.subject_gender !== null;
    });
</script>

{#if localizationTableView}
    <div class="row-column-localization">
        {#if hasVariants}
            <span class="variant-indicator" title="This localization has gender variants configured">
                variants
            </span>
        {/if}
        {#each localizationTableView.rows as localizationRowView (localizationRowView.id)}
            <InspectorLocalization
                rowView={localizationRowView}
                {showTitle}
                {showId}
                {showNickname}
                {showFormMatrix}
                showLocalizationButton={true}
            />
        {/each}
    </div>
{/if}

<style>
    .row-column-localization {
        padding: 0.5rem;
        background: var(--gs-bg-secondary);
        border: 1px solid var(--gs-border-primary);
        border-radius: 4px;
        position: relative;
    }

    .variant-indicator {
        position: absolute;
        top: 0.25rem;
        right: 0.375rem;
        font-size: 0.5625rem;
        font-weight: 600;
        text-transform: uppercase;
        letter-spacing: 0.05em;
        color: var(--gs-accent-fg, #60a5fa);
        opacity: 0.8;
    }
</style>
