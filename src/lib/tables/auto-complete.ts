import { db } from '@lib/api/db/db';
import { createEmptyFilter } from '@lib/api/db/db-filter';
import { TABLE_ID_AUTO_COMPLETES, type AutoComplete } from '@lib/api/db/db-schema';
import type { IDbTableView } from '@lib/api/db/db-view-table-interface';

/**Shared view of the auto-complete table.  */
export const autoCompleteTable: IDbTableView<AutoComplete> = db.fetchTable(
    TABLE_ID_AUTO_COMPLETES,
    createEmptyFilter(),
);
