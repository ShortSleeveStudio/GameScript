/**
 * CRUD operations for conversation tag values.
 *
 * Uses the generic tag factory - see crud-tag-factory.ts for implementation details.
 */

import {
  type Conversation,
  type ConversationTagValue,
  TABLE_CONVERSATION_TAG_VALUES,
  TABLE_CONVERSATIONS,
} from '@gamescript/shared';
import { createTagValueCrud } from './crud-tag-factory.js';

const crud = createTagValueCrud<ConversationTagValue, Conversation>({
  valueTable: TABLE_CONVERSATION_TAG_VALUES,
  entityTable: TABLE_CONVERSATIONS,
});

export const getAll = crud.getAll;
export const getById = crud.getById;
export const getByCategory = crud.getByCategory;
export const create = crud.create;
export const updateMany = crud.updateMany;
export const updateOne = crud.updateOne;
export const remove = crud.remove;
