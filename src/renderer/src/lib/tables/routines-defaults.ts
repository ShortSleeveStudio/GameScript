import { type Routine } from '@common/common-schema';
import { ROUTINE_TYPE_DEFAULT, TABLE_ROUTINES } from '@common/common-types';
import { db } from '@lib/api/db/db';
import { createFilter } from '@lib/api/db/db-filter';
import { ASC } from '@lib/api/db/db-filter-interface';
import type { IDbTableView } from '@lib/api/db/db-view-table-interface';

/**Shared view of default routines.  */
export const defaultRoutines: IDbTableView<Routine> = db.fetchTable(
    TABLE_ROUTINES,
    createFilter<Routine>()
        .where()
        .column('type')
        .eq(ROUTINE_TYPE_DEFAULT.id)
        .endWhere()
        .orderBy('id', ASC)
        .build(),
);
