<script lang="ts">
    import { type Locale, type LocalePrincipal, type Localization } from '@common/common-schema';
    import type { IDbRowView } from '@lib/api/db/db-view-row-interface';
    import { locales } from '@lib/tables/locales';
    import RowColumnId from '../common/RowColumnId.svelte';
    import { Accordion, AccordionItem, Button, Tooltip } from 'carbon-components-svelte';
    import RowColumnInput from '../common/RowColumnInput.svelte';
    import {
        LOCALIZATION_PLACEHOLDER_NICKNAME,
        LOCALIZATION_UNDO_NICKNAME,
    } from '@lib/constants/settings';
    import { getLocalePrincipal, localePrincipalTableView } from '@lib/tables/locale-principal';
    import { get } from 'svelte/store';
    import { focusOnNodeOfLocalization } from '@lib/graph/graph-helpers';
    import { APP_NAME } from '@common/constants';
    import RowColumnLocalizedTextArea from '../common/RowColumnLocalizedTextArea.svelte';
    import {
        focusManager,
        type Focus,
        FOCUS_MODE_REPLACE,
        FOCUS_REPLACE,
        type FocusRequest,
        type FocusRequests,
    } from '@lib/stores/app/focus';
    import { TABLE_LOCALIZATIONS } from '@common/common-types';
    import {
        EVENT_DOCK_SELECTION_REQUEST,
        EVENT_LF_FILTER_BY_ID,
        type DockSelectionRequest,
        type GridFilterByIdRequest,
    } from '@lib/constants/events';
    import { LAYOUT_ID_LOCALIZATION_EDITOR } from '@lib/constants/default-layout';

    export let rowView: IDbRowView<Localization>;
    export let showTitle: boolean = false;
    export let showId: boolean = true;
    export let showNickname: boolean = true;
    export let showAccordion: boolean = true;
    export let showConversationButton: boolean = false;
    export let showLocalizationButton: boolean = false;

    let primaryLocale: IDbRowView<Locale>;
    let localePrincipalView: IDbRowView<LocalePrincipal>;
    $: {
        if (locales && localePrincipalTableView) {
            const localesList: IDbRowView<Locale>[] = $locales;
            localePrincipalView = getLocalePrincipal($localePrincipalTableView);
            const localePrincipal: LocalePrincipal = $localePrincipalView;
            for (let i = 0; i < localesList.length; i++) {
                const locale: IDbRowView<Locale> = localesList[i];
                if (localePrincipal.principal === locale.id) {
                    primaryLocale = locale;
                    break;
                }
            }
        }
    }

    async function onFindConversation(): Promise<void> {
        await focusOnNodeOfLocalization(get(rowView));
    }

    async function onFindLocalization(): Promise<void> {
        const localizationFocusMap: Map<number, Focus> = new Map();
        localizationFocusMap.set(rowView.id, {
            rowId: rowView.id,
        });
        const conversationFocus: FocusRequest = <FocusRequest>{
            tableType: TABLE_LOCALIZATIONS,
            focus: localizationFocusMap,
            type: FOCUS_REPLACE,
        };
        focusManager.focus(<FocusRequests>{
            type: FOCUS_MODE_REPLACE,
            requests: [conversationFocus],
        });

        // Filter Localizations
        dispatchEvent(
            new CustomEvent(EVENT_LF_FILTER_BY_ID, {
                detail: <GridFilterByIdRequest>{ id: rowView.id },
            }),
        );
        dispatchEvent(
            new CustomEvent(EVENT_DOCK_SELECTION_REQUEST, {
                detail: <DockSelectionRequest>{ layoutId: LAYOUT_ID_LOCALIZATION_EDITOR },
            }),
        );
    }
</script>

{#if showTitle}
    <h2>Localization</h2>
{/if}
{#if showId}
    <p>
        <Tooltip triggerText="Localization ID" align="start" direction="bottom">
            <p>This is the unique id used to look up localized text at runtime.</p>
        </Tooltip>
        <RowColumnId {rowView} />
    </p>
{/if}
{#if showNickname}
    <p>
        <Tooltip triggerText="Localization Nickname" align="center" direction="bottom">
            <p>
                Nicknames are optional, but can be helpful to have for localizations you create
                manually.
            </p>
            <br />
            <p>
                They are used by each {APP_NAME} game engine plugin to help you locate localizations
                while you're building your game. As such, they don't need to be unique, but it's better
                if they are.
            </p>
            <br />
            <p>
                Once you've found the localization you're looking for, you can store the unique ID
                for use at runtime.
            </p>
        </Tooltip>
        <RowColumnInput
            {rowView}
            columnName={'name'}
            undoText={LOCALIZATION_UNDO_NICKNAME}
            inputPlaceholder={LOCALIZATION_PLACEHOLDER_NICKNAME}
        />
    </p>
{/if}
{#if locales}
    <p>
        <RowColumnLocalizedTextArea {rowView} locale={primaryLocale} />
    </p>

    {#if locales && $locales.length > 1}
        {#if showAccordion}
            <Accordion size="sm">
                <AccordionItem title="Other Locales" class="accordion-padding-defeat">
                    {#each $locales as locale (locale.id)}
                        {#if locale.id !== $primaryLocale.id}
                            <p>
                                <RowColumnLocalizedTextArea {rowView} {locale} />
                            </p>
                        {/if}
                    {/each}
                </AccordionItem>
            </Accordion>
        {:else}
            {#each $locales as locale (locale.id)}
                {#if locale.id !== $primaryLocale.id}
                    <p>
                        <RowColumnLocalizedTextArea {rowView} {locale} />
                    </p>
                {/if}
            {/each}
        {/if}
    {/if}
    {#if showLocalizationButton}
        <br />
        <Button size="small" on:click={onFindLocalization}>Find Localization</Button>
    {/if}
{/if}
{#if showConversationButton && rowView && $rowView.parent && $rowView.is_system_created}
    <p>
        <sup>Node</sup>
        <br />
        <Button size="small" on:click={onFindConversation}>Find Node</Button>
    </p>
{/if}
