<script lang="ts" generics="RowType extends Row">
    import type { DatabaseTableId, Row } from '@lib/api/db/db-schema';
    import type { IDbRowView } from '@lib/api/db/db-view-row-interface';
    import { focused, type FocusPayload } from '@lib/stores/app/focus';
    import { Button } from 'carbon-components-svelte';

    export let rowType: DatabaseTableId;
    export let rowView: IDbRowView<RowType>;
    export let payload: FocusPayload;

    function focusOnRowView(): void {
        focused.set({ tableId: rowType, rowView: rowView, payload: payload });
    }
</script>

<Button size="small" kind="ghost" style="width:100%" on:click={focusOnRowView}>View</Button>
