import { db } from '@lib/api/db/db';
import { createFilter } from '@lib/api/db/db-filter';
import { ASC } from '@lib/api/db/db-filter-interface';
import { TABLE_ID_ACTORS, type Actor } from '@lib/api/db/db-schema';
import type { IDbTableView } from '@lib/api/db/db-view-table-interface';

/**Shared view of the actors table.  */
export const actorsTable: IDbTableView<Actor> = db.fetchTable(
    TABLE_ID_ACTORS,
    createFilter<Actor>().orderBy('id', ASC).build(),
);
