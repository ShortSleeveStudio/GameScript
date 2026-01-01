/**
 * CRUD operations for localization tag values.
 *
 * Uses the generic tag factory - see crud-tag-factory.ts for implementation details.
 */

import {
  type Localization,
  type LocalizationTagValue,
  TABLE_LOCALIZATION_TAG_VALUES,
  TABLE_LOCALIZATIONS,
} from '@gamescript/shared';
import { createTagValueCrud } from './crud-tag-factory.js';

const crud = createTagValueCrud<LocalizationTagValue, Localization>({
  valueTable: TABLE_LOCALIZATION_TAG_VALUES,
  entityTable: TABLE_LOCALIZATIONS,
});

export const getAll = crud.getAll;
export const getById = crud.getById;
export const getByCategory = crud.getByCategory;
export const create = crud.create;
export const updateMany = crud.updateMany;
export const updateOne = crud.updateOne;
export const remove = crud.remove;
