import { db } from '@lib/api/db/db';
import { createFilter } from '@lib/api/db/db-filter';
import type { Filter } from '@lib/api/db/db-filter-interface';
import {
    TABLE_ID_ACTORS,
    TABLE_ID_DEFAULT_PROPERTIES,
    type DefaultProperty,
} from '@lib/api/db/db-schema';
import type { IDbTableView } from '@lib/api/db/db-view-table-interface';

/**Shared view of actor default properties.  */
const filter: Filter<DefaultProperty> = createFilter<DefaultProperty>()
    .where('parentType')
    .is(TABLE_ID_ACTORS)
    .build();
export const actorDefaultProperties: IDbTableView<DefaultProperty> = db.fetchTable(
    TABLE_ID_DEFAULT_PROPERTIES,
    filter,
);
