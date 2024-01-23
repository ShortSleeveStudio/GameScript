<script lang="ts">
    // TODO - consider deleting
    // import {
    //     PROPERTY_TYPE_ID_BOOLEAN,
    //     PROPERTY_TYPE_ID_DECIMAL,
    //     PROPERTY_TYPE_ID_INTEGER,
    //     PROPERTY_TYPE_ID_LOCALIZED_TEXT,
    //     PROPERTY_TYPE_ID_TEXT,
    //     type Property,
    // } from '@lib/api/db/db-schema';
    // import type { IDbRowView } from '@lib/api/db/db-view-row-interface';
    // import RowColumnTextArea from './RowColumnTextArea.svelte';
    // import {
    //     PROPERTY_PLACEHOLDER_TEXT,
    //     PROPERTY_UNDO_BOOL,
    //     PROPERTY_UNDO_INTEGER,
    //     PROPERTY_UNDO_TEXT,
    // } from '@lib/constants/settings';
    // import RowColumnNumber from './RowColumnNumber.svelte';
    // import RowColumnDropdown from './RowColumnDropdown.svelte';
    // import { BOOLEAN_DROP_DOWN_ITEMS } from '@lib/utility/properties';
    // import RowColumnLocalization from './RowColumnLocalization.svelte';

    // export let rowView: IDbRowView<Property>;
</script>

<!-- TODO: https://svelte-5-preview.vercel.app/status - also nameof<DefaultProperty>('type') -->
<!-- <p>
    {#if $rowView.type === PROPERTY_TYPE_ID_BOOLEAN}
        <sup>{$rowView.name}</sup>
        <RowColumnDropdown
            {rowView}
            dropdownItems={BOOLEAN_DROP_DOWN_ITEMS}
            undoText={PROPERTY_UNDO_BOOL}
            columnName={'bool'}
        />
    {:else if $rowView.type === PROPERTY_TYPE_ID_DECIMAL}
        <sup>{$rowView.name}</sup>
        <RowColumnNumber {rowView} undoText={PROPERTY_UNDO_INTEGER} columnName={'decimal'} />
    {:else if $rowView.type === PROPERTY_TYPE_ID_INTEGER}
        <sup>{$rowView.name}</sup>
        <RowColumnNumber
            isInteger={true}
            {rowView}
            undoText={PROPERTY_UNDO_INTEGER}
            columnName={'integer'}
        />
    {:else if $rowView.type === PROPERTY_TYPE_ID_TEXT}
        <sup>{$rowView.name}</sup>
        <RowColumnTextArea
            {rowView}
            undoText={PROPERTY_UNDO_TEXT}
            placeholder={PROPERTY_PLACEHOLDER_TEXT}
            columnName={'text'}
        />
    {:else if $rowView.type === PROPERTY_TYPE_ID_LOCALIZED_TEXT}
        <sup>{$rowView.name}</sup>
        <RowColumnLocalization {rowView} columnName={'localizedText'} />
    {/if}
</p> -->
