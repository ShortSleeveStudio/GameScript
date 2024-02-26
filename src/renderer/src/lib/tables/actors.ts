import { type Actor } from '@common/common-schema';
import { TABLE_ACTORS } from '@common/common-types';
import { db } from '@lib/api/db/db';
import { createFilter } from '@lib/api/db/db-filter';
import { ASC } from '@lib/api/db/db-filter-interface';
import type { IDbTableView } from '@lib/api/db/db-view-table-interface';

/**Shared view of the actors table.  */
export const actorsTable: IDbTableView<Actor> = db.fetchTable(
    TABLE_ACTORS,
    createFilter<Actor>().orderBy('id', ASC).build(),
);
