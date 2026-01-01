<script lang="ts">
    /**
     * Localization inspector panel.
     *
     * Displays and edits a localization entry, including:
     * - Localization ID (read-only)
     * - Nickname (optional name for easier identification)
     * - Localized text for primary locale
     * - Collapsible section for other locales
     *
     * Ported from GameScriptElectron.
     */
    import type { Locale, Localization } from '@gamescript/shared';
    import type { IDbRowView } from '$lib/db';
    import { localesTable } from '$lib/tables/locales.js';
    import { localePrincipalTableView, getLocalePrincipal } from '$lib/tables/locale-principal.js';
    import RowColumnId from '../common/RowColumnId.svelte';
    import RowColumnInput from '../common/RowColumnInput.svelte';
    import RowColumnLocalizedTextArea from '../common/RowColumnLocalizedTextArea.svelte';
    import {
        LOCALIZATION_PLACEHOLDER_NICKNAME,
        LOCALIZATION_UNDO_NICKNAME,
    } from '$lib/constants/settings.js';
    import { LAYOUT_ID_LOCALIZATION_EDITOR } from '$lib/constants/default-layout.js';
    import {
        requestDockSelection,
        filterLocalizationsById,
    } from '$lib/constants/events.js';
    import { focusOnNodeOfLocalization } from '$lib/utils/graph-helpers.js';
    import { focusLocalization } from '$lib/stores/focus.js';
    import { Accordion, Button } from '$lib/components/common';

    interface Props {
        rowView: IDbRowView<Localization>;
        showTitle?: boolean;
        showId?: boolean;
        showNickname?: boolean;
        showAccordion?: boolean;
        showConversationButton?: boolean;
        showLocalizationButton?: boolean;
    }

    let {
        rowView,
        showTitle = false,
        showId = true,
        showNickname = true,
        showAccordion = true,
        showConversationButton = false,
        showLocalizationButton = false,
    }: Props = $props();

    // Derive the primary locale from the locale principal
    let primaryLocale = $derived.by(() => {
        const localePrincipalView = getLocalePrincipal(localePrincipalTableView.rows);
        if (!localePrincipalView) return undefined;

        const principalId = localePrincipalView.data.principal;
        const localeRows = localesTable.rows;

        for (const localeRowView of localeRows) {
            if (localeRowView.data.id === principalId) {
                return localeRowView;
            }
        }
        return undefined;
    });

    async function onFindConversation(): Promise<void> {
        await focusOnNodeOfLocalization(rowView.getValue());
    }

    function onFindLocalization(): void {
        // Focus the localization
        focusLocalization(rowView.id);

        // Filter the localization editor to show this localization
        filterLocalizationsById(rowView.id);

        // Select/focus the localization editor panel
        requestDockSelection(LAYOUT_ID_LOCALIZATION_EDITOR);
    }
</script>

<div class="inspector-localization">
    {#if showTitle}
        <h2 class="section-title">Localization</h2>
    {/if}

    {#if showId}
        <div class="field-group">
            <label class="field-label" title="This is the unique id used to look up localized text at runtime.">
                Localization ID
            </label>
            <RowColumnId {rowView} />
        </div>
    {/if}

    {#if showNickname}
        <div class="field-group">
            <label class="field-label" title="Nicknames are optional, but can be helpful to have for localizations you create manually.">
                Nickname
            </label>
            <RowColumnInput
                {rowView}
                columnName="name"
                undoText={LOCALIZATION_UNDO_NICKNAME}
                inputPlaceholder={LOCALIZATION_PLACEHOLDER_NICKNAME}
            />
        </div>
    {/if}

    {#if primaryLocale}
        <div class="field-group">
            <RowColumnLocalizedTextArea {rowView} locale={primaryLocale} />
        </div>

        {#if localesTable.rows.length > 1}
            {#if showAccordion}
                <Accordion title="Other Locales" count={localesTable.rows.length - 1} size="small">
                    {#each localesTable.rows as locale (locale.id)}
                        {#if locale.id !== primaryLocale.id}
                            <div class="field-group">
                                <RowColumnLocalizedTextArea {rowView} {locale} />
                            </div>
                        {/if}
                    {/each}
                </Accordion>
            {:else}
                {#each localesTable.rows as locale (locale.id)}
                    {#if locale.id !== primaryLocale.id}
                        <div class="field-group">
                            <RowColumnLocalizedTextArea {rowView} {locale} />
                        </div>
                    {/if}
                {/each}
            {/if}
        {/if}

        {#if showLocalizationButton}
            <div class="button-group">
                <Button variant="ghost" size="small" onclick={onFindLocalization}>
                    Find Localization
                </Button>
            </div>
        {/if}
    {/if}

    {#if showConversationButton && rowView.data.parent && rowView.data.is_system_created}
        <div class="button-group">
            <Button variant="ghost" size="small" onclick={onFindConversation}>
                Find Node
            </Button>
        </div>
    {/if}
</div>

<style>
    .inspector-localization {
        display: flex;
        flex-direction: column;
        gap: 0.75rem;
    }

    .section-title {
        font-size: 1rem;
        font-weight: 600;
        margin: 0;
        color: var(--gs-fg-primary);
    }

    .field-group {
        display: flex;
        flex-direction: column;
        gap: 0.25rem;
    }

    .field-label {
        font-size: 0.75rem;
        font-weight: 500;
        color: var(--gs-fg-secondary);
        cursor: help;
    }

    .button-group {
        margin-top: 0.5rem;
    }
</style>
