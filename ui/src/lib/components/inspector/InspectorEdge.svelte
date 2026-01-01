<script lang="ts">
    /**
     * Inspector panel for Edge rows.
     *
     * Displays properties of a selected edge:
     * - ID, Conversation ID, Source, Target (read-only)
     * - Edge type (dropdown)
     * - Priority (number input)
     * - Show Target Node button (for hidden edges)
     *
     * Ported from GameScriptElectron.
     */
    import type { Edge } from '@gamescript/shared';
    import type { IDbRowView } from '$lib/db';
    import { TABLE_CONVERSATIONS, TABLE_NODES } from '$lib/db';
    import {
        RowColumnId,
        RowColumnInput,
        RowColumnDropdown,
        Button,
        InspectorField,
    } from '$lib/components/common';
    import {
        EDGE_UNDO_PRIORITY,
        EDGE_PLACEHOLDER_PRIORITY,
        EDGE_UNDO_TYPE,
    } from '$lib/constants/settings';
    import {
        focusManager,
        FOCUS_REPLACE,
        FOCUS_MODE_REPLACE,
        type Focus,
        type FocusRequest,
        type FocusRequests,
        type FocusPayloadGraphElement,
    } from '$lib/stores/focus.js';

    interface Props {
        rowView: IDbRowView<Edge>;
    }

    let { rowView }: Props = $props();

    // Edge type dropdown items
    const edgeTypeItems = [
        { id: 'default', text: 'Default' },
        { id: 'hidden', text: 'Hidden' },
    ];

    // Check if this is a hidden edge
    let isHiddenEdge = $derived(rowView.data.type === 'hidden');

    function onSelectNode(): void {
        const edge = rowView.data;

        // Create conversation focus
        const conversationFocusMap: Map<number, Focus> = new Map();
        conversationFocusMap.set(edge.parent, {
            rowId: edge.parent,
        });
        const conversationFocus: FocusRequest = {
            tableType: TABLE_CONVERSATIONS,
            focus: conversationFocusMap,
            type: FOCUS_REPLACE,
        };

        // Create node focus
        const nodeFocusMap: Map<number, Focus> = new Map();
        nodeFocusMap.set(edge.target, {
            rowId: edge.target,
            payload: {
                requestIsFromGraph: false,
            } as FocusPayloadGraphElement,
        });
        const nodeFocus: FocusRequest = {
            tableType: TABLE_NODES,
            focus: nodeFocusMap,
            type: FOCUS_REPLACE,
        };

        focusManager.focus({
            type: FOCUS_MODE_REPLACE,
            requests: [conversationFocus, nodeFocus],
        } as FocusRequests);
    }
</script>

<h2>Edge</h2>

<InspectorField label="ID">
    <RowColumnId {rowView} />
</InspectorField>

<InspectorField label="Conversation ID">
    <RowColumnId {rowView} columnName={'parent'} />
</InspectorField>

<InspectorField label="Source Node ID">
    <RowColumnId {rowView} columnName={'source'} />
</InspectorField>

<InspectorField label="Target Node ID">
    <RowColumnId {rowView} columnName={'target'} />
</InspectorField>

<InspectorField label="Edge Style">
    <RowColumnDropdown
        {rowView}
        columnName={'type'}
        undoText={EDGE_UNDO_TYPE}
        items={edgeTypeItems}
    />
</InspectorField>

<InspectorField label="Priority">
    <RowColumnInput
        {rowView}
        columnName={'priority'}
        undoText={EDGE_UNDO_PRIORITY}
        inputPlaceholder={EDGE_PLACEHOLDER_PRIORITY}
        isNumber={true}
        numberMax={255}
        numberMin={0}
    />
</InspectorField>

{#if isHiddenEdge}
    <InspectorField label="Target Node">
        <Button variant="ghost" size="small" onclick={onSelectNode}>
            Show Target Node
        </Button>
    </InspectorField>
{/if}

<style>
    h2 {
        margin: 0 0 1rem 0;
        font-size: 1.125rem;
        font-weight: 600;
        color: var(--gs-fg-primary);
    }
</style>
