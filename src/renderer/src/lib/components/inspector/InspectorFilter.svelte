<script lang="ts">
    import type { IDbRowView } from '@lib/api/db/db-view-row-interface';
    import type { FocusPayloadFilter } from '@lib/stores/app/focus';
    import RowColumnId from '../common/RowColumnId.svelte';
    import RowNameInput from '../common/RowNameInput.svelte';
    import {
        FILTER_PLACEHOLDER_NAME,
        FILTER_PLACEHOLDER_NOTES,
        FILTER_UNDO_NAME,
        FILTER_UNDO_NOTES,
    } from '@lib/constants/settings';
    import RowColumnTextArea from '../common/RowColumnTextArea.svelte';
    import type { Filter } from '@lib/api/db/db-schema';

    export let rowView: IDbRowView<Filter>;
    export let payload: FocusPayloadFilter;
</script>

<h2>Filter</h2>
<p>
    <sup>ID</sup>
    <RowColumnId {rowView} />
</p>
<p>
    <sup>Name</sup>
    <RowNameInput
        {rowView}
        undoText={FILTER_UNDO_NAME}
        inputPlaceholder={FILTER_PLACEHOLDER_NAME}
        uniqueNameTracker={payload.uniqueNameTracker}
        isInspectorField={true}
    />
</p>
<p>
    <sup>Notes</sup>
    <RowColumnTextArea
        {rowView}
        undoText={FILTER_UNDO_NOTES}
        columnName={'notes'}
        placeholder={FILTER_PLACEHOLDER_NOTES}
    />
</p>
