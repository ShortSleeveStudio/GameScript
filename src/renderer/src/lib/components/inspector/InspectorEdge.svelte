<script lang="ts">
    import type { IDbRowView } from '@lib/api/db/db-view-row-interface';
    import RowColumnId from '../common/RowColumnId.svelte';
    import type { Edge } from '@lib/api/db/db-schema';

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
    <sup>Input Node ID</sup>
    <RowColumnId {rowView} columnName={'source'} />
</p>
<p>
    <sup>Output Node ID</sup>
    <RowColumnId {rowView} columnName={'target'} />
</p>
