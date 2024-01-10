import { db } from '@lib/api/db/db';
import { createEmptyFilter } from '@lib/api/db/db-filter';
import { TABLE_ID_ACTORS, type Actor } from '@lib/api/db/db-schema';
import type { IDbTableView } from '@lib/api/db/db-view-table-interface';

/**Shared view of the actors table.  */
export const actorsTable: IDbTableView<Actor> = db.fetchTable(TABLE_ID_ACTORS, createEmptyFilter());
