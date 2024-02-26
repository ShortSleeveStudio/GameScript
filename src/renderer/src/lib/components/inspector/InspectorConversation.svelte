<script lang="ts">
    import { type Conversation } from '@common/common-schema';
    import type { IDbRowView } from '@lib/api/db/db-view-row-interface';
    import RowColumnId from '../common/RowColumnId.svelte';
    import RowColumnTextArea from '../common/RowColumnTextArea.svelte';
    import {
        CONVERSATION_PLACEHOLDER_NAME,
        CONVERSATION_PLACEHOLDER_NOTES,
        CONVERSATION_UNDO_NAME,
        CONVERSATION_UNDO_NOTES,
    } from '@lib/constants/settings';
    import LocalizationFilterButton from '../common/LocalizationFilterButton.svelte';
    import RowColumnInput from '../common/RowColumnInput.svelte';

    export let rowView: IDbRowView<Conversation>;
</script>

<h2>Conversation</h2>
<p>
    <sup>ID</sup>
    <RowColumnId {rowView} />
</p>
<p>
    <sup>Name</sup>
    <RowColumnInput
        {rowView}
        columnName={'name'}
        undoText={CONVERSATION_UNDO_NAME}
        inputPlaceholder={CONVERSATION_PLACEHOLDER_NAME}
    />
</p>
<p>
    <sup>Notes</sup>
    <RowColumnTextArea
        {rowView}
        undoText={CONVERSATION_UNDO_NOTES}
        columnName={'notes'}
        placeholder={CONVERSATION_PLACEHOLDER_NOTES}
    />
</p>
<p>
    <sup>Localizations</sup>
    <LocalizationFilterButton {rowView} />
</p>
