/**
 * CRUD operations for conversation tag categories.
 *
 * Uses the generic tag factory - see crud-tag-factory.ts for implementation details.
 */

import {
  type ConversationTagCategory,
  TABLE_CONVERSATION_TAG_CATEGORIES,
  TABLE_CONVERSATION_TAG_VALUES,
  TABLE_CONVERSATIONS,
} from '@gamescript/shared';
import { createTagCategoryCrud } from './crud-tag-factory.js';

const crud = createTagCategoryCrud<ConversationTagCategory>({
  categoryTable: TABLE_CONVERSATION_TAG_CATEGORIES,
  valueTable: TABLE_CONVERSATION_TAG_VALUES,
  entityTable: TABLE_CONVERSATIONS,
});

export const getAll = crud.getAll;
export const getById = crud.getById;
export const create = crud.create;
export const updateMany = crud.updateMany;
export const updateOne = crud.updateOne;
export const remove = crud.remove;
