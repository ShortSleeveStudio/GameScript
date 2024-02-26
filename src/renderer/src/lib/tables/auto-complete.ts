import { type AutoComplete } from '@common/common-schema';
import { TABLE_AUTO_COMPLETES } from '@common/common-types';
import { db } from '@lib/api/db/db';
import { createFilter } from '@lib/api/db/db-filter';
import { ASC } from '@lib/api/db/db-filter-interface';
import type { IDbTableView } from '@lib/api/db/db-view-table-interface';

/**Shared view of the auto-complete table.  */
export const autoCompleteTable: IDbTableView<AutoComplete> = db.fetchTable(
    TABLE_AUTO_COMPLETES,
    createFilter<AutoComplete>().orderBy('id', ASC).build(),
);
