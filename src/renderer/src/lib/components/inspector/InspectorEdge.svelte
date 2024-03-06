<script lang="ts">
    import type { IDbRowView } from '@lib/api/db/db-view-row-interface';
    import RowColumnId from '../common/RowColumnId.svelte';
    import RowColumnInput from '../common/RowColumnInput.svelte';
    import type { Edge } from '@common/common-schema';
    import {
        EDGE_PLACEHOLDER_PRIORITY,
        EDGE_UNDO_TYPE,
        EDGE_UNDO_PRIORITY,
    } from '@lib/constants/settings';
    import RowColumnDropdown from '../common/RowColumnDropdown.svelte';
    import {
        EDGE_TYPE_DROPDOWN_ITEMS,
        EDGE_TYPE_HIDDEN,
        TABLE_CONVERSATIONS,
        TABLE_NODES,
    } from '@common/common-types';
    import { Button } from 'carbon-components-svelte';
    import {
        FOCUS_REPLACE,
        type Focus,
        type FocusPayloadGraphElement,
        type FocusRequest,
        type FocusRequests,
        focusManager,
        FOCUS_MODE_REPLACE,
    } from '@lib/stores/app/focus';
    import { get } from 'svelte/store';

    export let rowView: IDbRowView<Edge>;

    function onSelectNode(): void {
        // Grab edge
        const edge: Edge = get(rowView);

        // Create conversation focus
        const conversationFocusMap: Map<number, Focus> = new Map();
        conversationFocusMap.set(edge.parent, {
            rowId: edge.parent,
        });
        const conversationFocus: FocusRequest = <FocusRequest>{
            tableType: TABLE_CONVERSATIONS,
            focus: conversationFocusMap,
            type: FOCUS_REPLACE,
        };

        // Create node focus
        const nodeFocusMap: Map<number, Focus> = new Map();
        nodeFocusMap.set(edge.target, <Focus>{
            rowId: edge.target,
            payload: <FocusPayloadGraphElement>{
                requestIsFromGraph: false,
            },
        });
        const nodeFocus: FocusRequest = <FocusRequest>{
            tableType: TABLE_NODES,
            focus: nodeFocusMap,
            type: FOCUS_REPLACE,
        };
        focusManager.focus(<FocusRequests>{
            type: FOCUS_MODE_REPLACE,
            requests: [conversationFocus, nodeFocus],
        });
    }
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
    <sup>Edge Style</sup>
    <RowColumnDropdown
        {rowView}
        columnName={'type'}
        undoText={EDGE_UNDO_TYPE}
        dropdownItems={EDGE_TYPE_DROPDOWN_ITEMS}
    />
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
{#if $rowView.type === EDGE_TYPE_HIDDEN.name}
    <p>
        <sup>Target Node</sup>
        <br />
        <Button size="small" on:click={onSelectNode}>Show Target Node</Button>
    </p>
{/if}
