<script lang="ts">
    import type { Localization } from '@lib/api/db/db-schema';
    import type { IDbRowView } from '@lib/api/db/db-view-row-interface';
    import { locales } from '@lib/tables/locales';
    import RowColumnId from '../common/RowColumnId.svelte';
    import { Tooltip } from 'carbon-components-svelte';
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

    export let showTitle: boolean = false;
    export let rowView: IDbRowView<Localization>;
</script>

{#if showTitle}
    <h2>Localization</h2>
{/if}
<p>
    <Tooltip triggerText="Localization ID" align="start" direction="bottom">
        <p>This is the unique id used to look up localized text at runtime.</p>
    </Tooltip>
    <RowColumnId {rowView} />
</p>
<p>
    <Tooltip triggerText="Localization Nickname" align="center" direction="bottom">
        <p>
            Nicknames are optional, but can be helpful to have for localizations you create
            manually.
        </p>
        <br />
        <p>
            They are used by each {window.api.constants.APP_NAME} game engine plugin to help you locate
            localizations while you're building your game. As such, they don't need to be unique, but
            it's better if they are.
        </p>
        <br />
        <p>
            Once you've found the localization you're looking for, you can store the unique ID for
            use at runtime.
        </p>
    </Tooltip>
    <RowColumnInput
        {rowView}
        columnName={'name'}
        undoText={LOCALIZATION_UNDO_NICKNAME}
        inputPlaceholder={LOCALIZATION_PLACEHOLDER_NICKNAME}
    />
</p>
{#each $locales as locale (locale.id)}
    <p>
        <sup><RowColumnText rowView={locale} columnName={'name'} /></sup>
        <RowColumnTextArea
            {rowView}
            columnName={localeIdToColumn(locale.id)}
            undoText={LOCALIZATION_UNDO_TEXT}
            placeholder={LOCALIZATION_PLACEHOLDER_TEXT}
        />
    </p>
{/each}
