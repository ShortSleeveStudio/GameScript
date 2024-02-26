import { type Filter } from '@common/common-schema';
import { TABLE_FILTERS } from '@common/common-types';
import { db } from '@lib/api/db/db';
import { createFilter } from '@lib/api/db/db-filter';
import { ASC } from '@lib/api/db/db-filter-interface';
import type { IDbTableView } from '@lib/api/db/db-view-table-interface';

/**Shared view of all filters. */
export const filters: IDbTableView<Filter> = db.fetchTable(
    TABLE_FILTERS,
    createFilter<Filter>().orderBy('id', ASC).build(),
);
