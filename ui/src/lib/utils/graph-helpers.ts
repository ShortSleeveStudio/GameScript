/**
 * Graph navigation helper functions.
 *
 * Provides utilities for navigating to nodes from localizations or other entities.
 */

import type { Localization, Node } from '@gamescript/shared';
import { query, TABLE_NODES, TABLE_CONVERSATIONS, type QueryFilter } from '$lib/db';
import { fetchRowsRaw } from '$lib/crud/crud-common.js';
import {
    focusManager,
    FOCUS_REPLACE,
    FOCUS_MODE_REPLACE,
    type Focus,
    type FocusRequest,
    type FocusRequests,
    type FocusPayloadGraphElement,
} from '$lib/stores/focus.js';

/**
 * Debounce helper that returns a guard function.
 * Returns true if the operation should proceed, false if it's already in progress.
 */
function createOperationGuard(): { acquire: () => boolean; release: () => void } {
    let inProgress = false;
    return {
        acquire: () => {
            if (inProgress) return false;
            inProgress = true;
            return true;
        },
        release: () => {
            inProgress = false;
        },
    };
}

const focusGuard = createOperationGuard();

/**
 * Focus on a node with the given filter.
 * Also focuses the parent conversation.
 */
async function focusOnNode(parentConversation: number, filter: QueryFilter<Node>): Promise<void> {
    if (!focusGuard.acquire()) return;
    try {
        // Skip if no parent conversation
        if (!parentConversation) return;

        // Create conversation focus
        const conversationFocusMap: Map<number, Focus> = new Map();
        conversationFocusMap.set(parentConversation, {
            rowId: parentConversation,
        });
        const conversationFocus: FocusRequest = {
            tableType: TABLE_CONVERSATIONS,
            focus: conversationFocusMap,
            type: FOCUS_REPLACE,
        };

        // Focus conversation first
        focusManager.focus({
            type: FOCUS_MODE_REPLACE,
            requests: [conversationFocus],
        } as FocusRequests);

        // Find the node matching the filter
        const rawRows: Node[] = await fetchRowsRaw(TABLE_NODES, filter);
        if (!rawRows || rawRows.length !== 1) return;

        // Focus on the node
        const nodeFocusMap: Map<number, Focus> = new Map();
        const node: Node = rawRows[0];
        nodeFocusMap.set(node.id, {
            rowId: node.id,
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
            requests: [nodeFocus],
        } as FocusRequests);
    } finally {
        focusGuard.release();
    }
}

/**
 * Navigate to the node that owns a localization (voice text or UI response text).
 */
export async function focusOnNodeOfLocalization(localization: Localization): Promise<void> {
    // Skip if localization has no parent conversation
    if (localization.parent === null) return;

    await focusOnNode(
        localization.parent,
        query<Node>()
            .where('voice_text')
            .eq(localization.id)
            .or('ui_response_text')
            .eq(localization.id)
            .build(),
    );
}
