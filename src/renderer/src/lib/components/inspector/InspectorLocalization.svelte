<script lang="ts">
    import { type Locale, type LocalePrincipal, type Localization } from '@lib/api/db/db-schema';
    import type { IDbRowView } from '@lib/api/db/db-view-row-interface';
    import { locales } from '@lib/tables/locales';
    import RowColumnId from '../common/RowColumnId.svelte';
    import { Accordion, AccordionItem, Button, Tooltip } from 'carbon-components-svelte';
    import RowColumnInput from '../common/RowColumnInput.svelte';
    import {
        LOCALIZATION_PLACEHOLDER_NICKNAME,
        LOCALIZATION_PLACEHOLDER_TEXT,
        LOCALIZATION_UNDO_NICKNAME,
        LOCALIZATION_UNDO_TEXT,
    } from '@lib/constants/settings';
    import RowColumnText from '../common/RowColumnText.svelte';
    import RowColumnTextArea from '../common/RowColumnTextArea.svelte';
    import { localeIdToColumn } from '@lib/utility/locale';
    import { getLocalePrincipal, localePrincipalTableView } from '@lib/tables/locale-principal';
    import { get } from 'svelte/store';
    import { focusOnNodeOfLocalization } from '@lib/graph/graph-helpers';
    import { APP_NAME } from '@common/constants';

    export let showTitle: boolean = false;
    export let showId: boolean = true;
    export let showNickname: boolean = true;
    export let rowView: IDbRowView<Localization>;
    export let showConversationButton: boolean = false;

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
        <RowColumnTextArea
            {rowView}
            labelText={primaryLocale ? $primaryLocale.name : ''}
            columnName={localeIdToColumn($primaryLocale.id)}
            undoText={LOCALIZATION_UNDO_TEXT}
            placeholder={LOCALIZATION_PLACEHOLDER_TEXT}
        />
    </p>

    {#if locales && $locales.length > 1}
        <Accordion size="sm">
            <AccordionItem title="Other Locales" class="accordion-padding-defeat">
                {#each $locales as locale (locale.id)}
                    {#if locale.id !== $primaryLocale.id}
                        <p>
                            <sup><RowColumnText rowView={locale} columnName={'name'} /></sup>
                            <RowColumnTextArea
                                {rowView}
                                columnName={localeIdToColumn(locale.id)}
                                undoText={LOCALIZATION_UNDO_TEXT}
                                placeholder={LOCALIZATION_PLACEHOLDER_TEXT}
                            />
                        </p>
                    {/if}
                {/each}
            </AccordionItem>
        </Accordion>
    {/if}
{/if}
{#if showConversationButton && rowView && $rowView.parent}
    <p>
        <sup>Node</sup>
        <br />
        <Button size="small" on:click={onFindConversation}>Find Node</Button>
    </p>
{/if}
