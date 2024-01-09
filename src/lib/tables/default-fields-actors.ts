import { db } from '@lib/api/db/db';
import { createFilter } from '@lib/api/db/db-filter';
import type { Filter } from '@lib/api/db/db-filter-interface';
import { TABLE_ID_ACTORS, TABLE_ID_DEFAULT_FIELDS, type DefaultField } from '@lib/api/db/db-schema';
import type { IDbTableView } from '@lib/api/db/db-view-table-interface';

/**Shared view of actor default fields.  */
const filter: Filter<DefaultField> = createFilter<DefaultField>()
    .where('parentType')
    .is(TABLE_ID_ACTORS)
    .build();
export const actorDefaultFields: IDbTableView<DefaultField> = db.fetchTable(
    TABLE_ID_DEFAULT_FIELDS,
    filter,
);
