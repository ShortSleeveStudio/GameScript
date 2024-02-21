<script lang="ts">
    import type { Row } from '@lib/api/db/db-schema';
    import type { IDbRowView } from '@lib/api/db/db-view-row-interface';
    import {
        type FocusPayload,
        focusManager,
        type FocusRequest,
        type Focus,
        FOCUS_REPLACE,
        FOCUS_MODE_REPLACE,
        type FocusRequests,
    } from '@lib/stores/app/focus';
    import { Button } from 'carbon-components-svelte';

    export let rowView: IDbRowView<Row>;
    export let payload: FocusPayload;

    function focusOnRowView(): void {
        const focusMap: Map<number, Focus> = new Map();
        focusMap.set(rowView.id, { rowId: rowView.id, payload: payload });
        focusManager.focus(<FocusRequests>{
            type: FOCUS_MODE_REPLACE,
            requests: [
                <FocusRequest>{
                    tableId: rowView.tableId,
                    focus: focusMap,
                    type: FOCUS_REPLACE,
                },
            ],
        });
    }
</script>

<Button size="small" kind="ghost" style="width:100%" on:click={focusOnRowView}>View</Button>
