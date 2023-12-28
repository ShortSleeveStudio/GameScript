import { db } from '@lib/api/db/db';
import { TABLE_NAME_DEFAULT_FIELDS, type DefaultFieldRow } from '@lib/api/db/db-types';
import type { IDbTableView } from '@lib/api/db/db-view-table-interface';

/**Shared view of default fields table. */
export const defaultFieldTableView: IDbTableView<DefaultFieldRow> =
    db.fetchTable(TABLE_NAME_DEFAULT_FIELDS);
