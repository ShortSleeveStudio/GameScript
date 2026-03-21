<script lang="ts">
    /**
     * Localization inspector panel.
     *
     * Structure:
     *   [ Source text textarea      ]  ← x-source other/other form
     *   [ ☐ Templated               ]
     *
     *   ▼ French (primary locale)
     *     Subject: [dropdown]
     *     [ plural × gender form fields ]
     *
     *   ▶ Japanese
     *     ...
     *
     * x-source has no accordion entry — its content is the top-level source textarea.
     * Subject is a translator concern and lives inside each locale's accordion section.
     * Gender column visibility is derived from subject — no manual toggles.
     */
    import type { Locale, Localization } from '@gamescript/shared';
    import { localeIdToColumns, isKnownLocale, getLocaleAutonym } from '@gamescript/shared';
    import type { IDbRowView } from '$lib/db';
    import { localesTable } from '$lib/tables/locales.js';
    import { localePrincipalTableView, getLocalePrincipal } from '$lib/tables/locale-principal.js';
    import { systemCreatedLocaleTableView, getSystemCreatedLocale } from '$lib/tables/locale-system-created.js';
    import { localizationTagCategoriesTable, localizationTagValuesTable } from '$lib/tables';
    import { localizations, common } from '$lib/crud';
    import { IsLoadingStore } from '$lib/stores/is-loading.js';
    import RowColumnId from '../common/RowColumnId.svelte';
    import RowColumnInput from '../common/RowColumnInput.svelte';
    import RowColumnTextArea from '../common/RowColumnTextArea.svelte';
    import LocalizationFormFields from '../common/LocalizationFormFields.svelte';
    import SubjectActorSelector from '../common/SubjectActorSelector.svelte';
    import { Accordion, Button, Checkbox, InspectorField, InspectorTagFields } from '$lib/components/common';
    import {
        LOCALIZATION_PLACEHOLDER_NICKNAME,
        LOCALIZATION_UNDO_NICKNAME,
        LOCALIZATION_PLACEHOLDER_TEXT,
        LOCALIZATION_UNDO_TEXT,
    } from '$lib/constants/settings.js';
    import { LAYOUT_ID_LOCALIZATION_EDITOR } from '$lib/constants/default-layout.js';
    import {
        requestDockSelection,
        filterLocalizationsById,
    } from '$lib/constants/events.js';
    import { focusOnNodeOfLocalization } from '$lib/utils/graph-helpers.js';
    import { focusLocalization } from '$lib/stores/focus.js';

    interface Props {
        rowView: IDbRowView<Localization>;
        showTitle?: boolean;
        showId?: boolean;
        showNickname?: boolean;
        /**
         * When false, each locale accordion shows only the other/other form
         * (no Subject dropdown, no plural/gender matrix). Used for actor names.
         */
        showFormMatrix?: boolean;
        showConversationButton?: boolean;
        showLocalizationButton?: boolean;
    }

    let {
        rowView,
        showTitle = false,
        showId = true,
        showNickname = true,
        showFormMatrix = true,
        showConversationButton = false,
        showLocalizationButton = false,
    }: Props = $props();

    const isLoading = new IsLoadingStore();

    // x-source locale — provides the source text column
    let xSourceLocale = $derived(getSystemCreatedLocale(systemCreatedLocaleTableView.rows));
    let sourceColumn = $derived(
        xSourceLocale ? localeIdToColumns(xSourceLocale.data.id).default : ''
    );

    // Primary real locale — first to expand
    let primaryLocaleId = $derived.by(() => {
        const principal = getLocalePrincipal(localePrincipalTableView.rows);
        return principal?.data.principal ?? null;
    });

    // Real locales only (not x-source)
    let realLocales = $derived(
        localesTable.rows.filter(r => !r.data.is_system_created)
    );

    async function onTemplatedChange(checked: boolean): Promise<void> {
        const oldRow = { ...rowView.getValue() };
        const newRow = { ...oldRow, is_templated: checked };
        await isLoading.wrapPromise(
            common.updateOne(rowView.tableType, oldRow, newRow, 'is_templated change')
        );
    }

    async function onFindConversation(): Promise<void> {
        await focusOnNodeOfLocalization(rowView.getValue());
    }

    function onFindLocalization(): void {
        focusLocalization(rowView.id);
        filterLocalizationsById(rowView.id);
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

    {#if xSourceLocale && sourceColumn}
        <!-- Source text: x-source other/other — always at top, no accordion -->
        <div class="field-group">
            <label class="field-label">Source</label>
            <RowColumnTextArea
                {rowView}
                columnName={sourceColumn}
                undoText={LOCALIZATION_UNDO_TEXT}
                placeholder={LOCALIZATION_PLACEHOLDER_TEXT}
                rows={2}
            />
        </div>
    {/if}

    {#if showFormMatrix}
        <!-- Settings: subject + templated — shared across all locales -->
        <Accordion title="Settings" size="small">
            <div class="settings-content">
                <SubjectActorSelector {rowView} />
                <InspectorField
                    label="Templated"
                    tooltip="When enabled, this localization uses {'{'}placeholder{'}'} syntax for runtime substitution (e.g. numbers, names, currencies)."
                >
                    <Checkbox
                        checked={Boolean(rowView.data.is_templated)}
                        disabled={$isLoading}
                        onchange={onTemplatedChange}
                    />
                </InspectorField>
            </div>
        </Accordion>
    {/if}

    <!-- Real locale accordions -->
    {#each realLocales as locale (locale.id)}
        {@const isPrimary = locale.data.id === primaryLocaleId}
        {@const code = locale.data.name}
        {@const displayTitle = isKnownLocale(code) ? `${code} — ${getLocaleAutonym(code)}` : code}
        <Accordion
            title={displayTitle}
            size="small"
            expanded={isPrimary}
        >
            <LocalizationFormFields
                {rowView}
                {locale}
                defaultOnly={!showFormMatrix}
            />
        </Accordion>
    {/each}

    <InspectorTagFields
        {rowView}
        categoriesTable={localizationTagCategoriesTable}
        valuesTable={localizationTagValuesTable}
        crud={localizations}
    />

    {#if showLocalizationButton}
        <div class="button-group">
            <Button variant="ghost" size="small" onclick={onFindLocalization}>
                Find Localization
            </Button>
        </div>
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
    }

    .settings-content {
        display: flex;
        flex-direction: column;
        gap: 0.5rem;
    }

    .button-group {
        margin-top: 0.25rem;
    }
</style>
