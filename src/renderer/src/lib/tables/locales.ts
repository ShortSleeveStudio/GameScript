import { TABLE_LOCALES } from '@common/common-types';
import { db } from '@lib/api/db/db';
import { createFilter } from '@lib/api/db/db-filter';
import { ASC } from '@lib/api/db/db-filter-interface';
import { type Locale } from '@lib/api/db/db-schema';
import type { IDbTableView } from '@lib/api/db/db-view-table-interface';

/**Shared view of all locales. */
export const locales: IDbTableView<Locale> = db.fetchTable(
    TABLE_LOCALES,
    createFilter<Locale>().orderBy('id', ASC).build(),
);
