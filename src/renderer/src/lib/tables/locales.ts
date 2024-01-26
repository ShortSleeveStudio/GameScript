import { db } from '@lib/api/db/db';
import { createFilter } from '@lib/api/db/db-filter';
import { ASC } from '@lib/api/db/db-filter-interface';
import { TABLE_ID_LOCALES, type Locale } from '@lib/api/db/db-schema';
import type { IDbTableView } from '@lib/api/db/db-view-table-interface';

/**Shared view of all locales. */
export const locales: IDbTableView<Locale> = db.fetchTable(
    TABLE_ID_LOCALES,
    createFilter<Locale>().orderBy('id', ASC).build(),
);
