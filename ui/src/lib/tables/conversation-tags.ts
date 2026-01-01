/**
 * Shared views of the conversation tag tables.
 *
 * These singletons provide reactive views of conversation tag categories and values.
 * Used by ConversationFinder to dynamically add tag columns.
 */

import type { ConversationTagCategory, ConversationTagValue } from '@gamescript/shared';
import {
  query,
  TABLE_CONVERSATION_TAG_CATEGORIES,
  TABLE_CONVERSATION_TAG_VALUES,
  type IDbTableView,
} from '$lib/db';
import { common } from '$lib/crud';

/** Shared view of the conversation tag categories table, ordered by ID ascending. */
export const conversationTagCategoriesTable: IDbTableView<ConversationTagCategory> = common.fetchTable(
  TABLE_CONVERSATION_TAG_CATEGORIES,
  query<ConversationTagCategory>().orderBy('id', 'ASC').build()
);

/** Shared view of the conversation tag values table, ordered by ID ascending. */
export const conversationTagValuesTable: IDbTableView<ConversationTagValue> = common.fetchTable(
  TABLE_CONVERSATION_TAG_VALUES,
  query<ConversationTagValue>().orderBy('id', 'ASC').build()
);
