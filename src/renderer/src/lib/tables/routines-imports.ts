import { ROUTINE_TYPE_IMPORT, TABLE_ROUTINES } from '@common/common-types';
import { db } from '@lib/api/db/db';
import { createFilter } from '@lib/api/db/db-filter';
import { type Routine } from '@lib/api/db/db-schema';
import type { IDbTableView } from '@lib/api/db/db-view-table-interface';

/**Shared view of the import routines. */
export const importRoutines: IDbTableView<Routine> = db.fetchTable(
    TABLE_ROUTINES,
    createFilter<Routine>().where().column('type').eq(ROUTINE_TYPE_IMPORT.id).endWhere().build(),
);
