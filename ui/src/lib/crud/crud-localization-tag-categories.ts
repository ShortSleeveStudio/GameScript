/**
 * CRUD operations for localization tag categories.
 *
 * Uses the generic tag factory - see crud-tag-factory.ts for implementation details.
 */

import {
  type LocalizationTagCategory,
  TABLE_LOCALIZATION_TAG_CATEGORIES,
  TABLE_LOCALIZATION_TAG_VALUES,
  TABLE_LOCALIZATIONS,
} from '@gamescript/shared';
import { createTagCategoryCrud } from './crud-tag-factory.js';

const crud = createTagCategoryCrud<LocalizationTagCategory>({
  categoryTable: TABLE_LOCALIZATION_TAG_CATEGORIES,
  valueTable: TABLE_LOCALIZATION_TAG_VALUES,
  entityTable: TABLE_LOCALIZATIONS,
});

export const getAll = crud.getAll;
export const getById = crud.getById;
export const create = crud.create;
export const updateMany = crud.updateMany;
export const updateOne = crud.updateOne;
export const remove = crud.remove;
