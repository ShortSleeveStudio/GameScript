import { type Localization, type Node, type Routine } from '@common/common-schema';
import { TABLE_CONVERSATIONS, TABLE_NODES } from '@common/common-types';
import { db } from '@lib/api/db/db';
import { createFilter } from '@lib/api/db/db-filter';
import type { Filter } from '@lib/api/db/db-filter-interface';
import {
    FOCUS_MODE_REPLACE,
    FOCUS_REPLACE,
    focusManager,
    type Focus,
    type FocusPayloadGraphElement,
    type FocusRequest,
    type FocusRequests,
} from '@lib/stores/app/focus';

let clickInProgress: boolean = false;

async function focusOnNode(parentConversation: number, filter: Filter<Node>): Promise<void> {
    if (clickInProgress) return;
    try {
        clickInProgress = true;

        // Skip routines/localizations without parents
        if (!parentConversation) return;

        // Create conversation focus
        const conversationFocusMap: Map<number, Focus> = new Map();
        conversationFocusMap.set(parentConversation, {
            rowId: parentConversation,
        });
        const conversationFocus: FocusRequest = <FocusRequest>{
            tableType: TABLE_CONVERSATIONS,
            focus: conversationFocusMap,
            type: FOCUS_REPLACE,
        };
        focusManager.focus(<FocusRequests>{
            type: FOCUS_MODE_REPLACE,
            requests: [conversationFocus],
        });

        // Filter Conversations
        // dispatchEvent(
        //     new CustomEvent(EVENT_FINDER_FILTER_BY_PARENT, {
        //         detail: <GridFilterByParentRequest>{ parent: parentConversation },
        //     }),
        // );

        // Focus on node
        const rawRows: Node[] = await db.fetchRowsRaw(TABLE_NODES, filter);
        if (!rawRows || rawRows.length !== 1) return;
        const nodeFocusMap: Map<number, Focus> = new Map();
        const node: Node = rawRows[0];
        nodeFocusMap.set(node.id, <Focus>{
            rowId: node.id,
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
            requests: [nodeFocus],
        });
    } finally {
        clickInProgress = false;
    }
}

export async function focusOnNodeOfLocalization(localization: Localization): Promise<void> {
    await focusOnNode(
        localization.parent,
        createFilter<Node>()
            .where()
            .column('voice_text')
            .eq(localization.id)
            .or()
            .column('ui_response_text')
            .eq(localization.id)
            .endWhere()
            .build(),
    );
}

export async function focusOnNodeOfRoutine(routine: Routine): Promise<void> {
    await focusOnNode(
        routine.parent,
        createFilter<Node>()
            .where()
            .column('code')
            .eq(routine.id)
            .or()
            .column('condition')
            .eq(routine.id)
            .endWhere()
            .build(),
    );
}
