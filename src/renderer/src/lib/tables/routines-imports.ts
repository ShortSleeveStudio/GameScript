import { db } from '@lib/api/db/db';
import { createFilter } from '@lib/api/db/db-filter';
import { ROUTINE_TYPE_ID_IMPORTS, TABLE_ID_ROUTINES, type Routine } from '@lib/api/db/db-schema';
import type { IDbTableView } from '@lib/api/db/db-view-table-interface';

/**Shared view of the import routines. */
export const importRoutines: IDbTableView<Routine> = db.fetchTable(
    TABLE_ID_ROUTINES,
    createFilter<Routine>().where().column('type').is(ROUTINE_TYPE_ID_IMPORTS).endWhere().build(),
);
