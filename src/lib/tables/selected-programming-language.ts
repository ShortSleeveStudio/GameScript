import { db } from '@lib/api/db/db';
import {
    TABLE_NAME_SELECTED_PROGRAMMING_LANGUAGE,
    type SelectedProgrammingLanguageRow,
} from '@lib/api/db/db-types';
import type { IDbTableView } from '@lib/api/db/db-view-table-interface';

/**Shared view of selected programming language table. */
export const selectedProgrammingLanguageTableView: IDbTableView<SelectedProgrammingLanguageRow> =
    db.fetchTable(TABLE_NAME_SELECTED_PROGRAMMING_LANGUAGE);
