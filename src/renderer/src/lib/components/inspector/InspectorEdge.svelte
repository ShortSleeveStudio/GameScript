<script lang="ts">
    import type { IDbRowView } from '@lib/api/db/db-view-row-interface';
    import RowColumnId from '../common/RowColumnId.svelte';
    import RowColumnInput from '../common/RowColumnInput.svelte';
    import type { Edge } from '@common/common-schema';
    import { EDGE_PLACEHOLDER_PRIORITY, EDGE_UNDO_PRIORITY } from '@lib/constants/settings';

    export let rowView: IDbRowView<Edge>;
</script>

<h2>Edge</h2>
<p>
    <sup>ID</sup>
    <RowColumnId {rowView} />
</p>
<p>
    <sup>Conversation ID</sup>
    <RowColumnId {rowView} columnName={'parent'} />
</p>
<p>
    <sup>Source Node ID</sup>
    <RowColumnId {rowView} columnName={'source'} />
</p>
<p>
    <sup>Target Node ID</sup>
    <RowColumnId {rowView} columnName={'target'} />
</p>
<p>
    <sup>Priority</sup>
    <RowColumnInput
        {rowView}
        columnName={'priority'}
        undoText={EDGE_UNDO_PRIORITY}
        inputPlaceholder={EDGE_PLACEHOLDER_PRIORITY}
        isNumber={true}
    />
</p>
