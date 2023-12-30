import { db } from '@lib/api/db/db';
import { createFilter } from '@lib/api/db/db-filter';
import type { Filter } from '@lib/api/db/db-filter-interface';
import {
    NODE_TYPE_ID_PROGRAMMING_LANGUAGE,
    TABLE_NAME_NODES,
    type NodeRow,
} from '@lib/api/db/db-schema';
import type { IDbTableView } from '@lib/api/db/db-view-table-interface';

/**Shared view of selected programming language table. */
const filter: Filter<NodeRow> = createFilter<NodeRow>()
    .where('type')
    .is(NODE_TYPE_ID_PROGRAMMING_LANGUAGE)
    .build();
export const programmingLanguage: IDbTableView<NodeRow> = db.fetchTable(TABLE_NAME_NODES, filter);
