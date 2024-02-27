<script lang="ts">
    import { type Localization, type Locale } from '@common/common-schema';
    import type { IDbRowView } from '@lib/api/db/db-view-row-interface';
    import RowColumnTextArea from './RowColumnTextArea.svelte';
    import { localeIdToColumn } from '@common/common-locale';
    import { LOCALIZATION_PLACEHOLDER_TEXT, LOCALIZATION_UNDO_TEXT } from '@lib/constants/settings';

    export let rowView: IDbRowView<Localization>;
    export let locale: IDbRowView<Locale>;
</script>

<RowColumnTextArea
    {rowView}
    labelText={locale ? $locale.name : ''}
    columnName={localeIdToColumn($locale.id)}
    undoText={LOCALIZATION_UNDO_TEXT}
    placeholder={LOCALIZATION_PLACEHOLDER_TEXT}
/>
