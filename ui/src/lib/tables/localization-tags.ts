/**
 * Shared views of the localization tag tables.
 *
 * These singletons provide reactive views of localization tag categories and values.
 * Used by LocalizationEditor to dynamically add tag columns.
 */

import type { LocalizationTagCategory, LocalizationTagValue } from '@gamescript/shared';
import {
  query,
  TABLE_LOCALIZATION_TAG_CATEGORIES,
  TABLE_LOCALIZATION_TAG_VALUES,
  type IDbTableView,
} from '$lib/db';
import { common } from '$lib/crud';

/** Shared view of the localization tag categories table, ordered by ID ascending. */
export const localizationTagCategoriesTable: IDbTableView<LocalizationTagCategory> = common.fetchTable(
  TABLE_LOCALIZATION_TAG_CATEGORIES,
  query<LocalizationTagCategory>().orderBy('id', 'ASC').build()
);

/** Shared view of the localization tag values table, ordered by ID ascending. */
export const localizationTagValuesTable: IDbTableView<LocalizationTagValue> = common.fetchTable(
  TABLE_LOCALIZATION_TAG_VALUES,
  query<LocalizationTagValue>().orderBy('id', 'ASC').build()
);
