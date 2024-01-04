import { db } from '@lib/api/db/db';
import { createFilter } from '@lib/api/db/db-filter';
import { TABLE_ID_ROUTINES, type Routine } from '@lib/api/db/db-schema';
import type { IDbTableView } from '@lib/api/db/db-view-table-interface';

/**Shared view of default routines.  */
export const defaultRoutines: IDbTableView<Routine> = db.fetchTable(
    TABLE_ID_ROUTINES,
    createFilter<Routine>().where('isDefault').is(true).build(),
);
