import { db } from '@lib/api/db/db';
import { createFilter } from '@lib/api/db/db-filter';
import { ASC } from '@lib/api/db/db-filter-interface';
import { TABLE_ID_FILTERS, type Filter } from '@lib/api/db/db-schema';
import type { IDbTableView } from '@lib/api/db/db-view-table-interface';

/**Shared view of all filters. */
export const filters: IDbTableView<Filter> = db.fetchTable(
    TABLE_ID_FILTERS,
    createFilter<Filter>().orderBy('id', ASC).build(),
);
