import { db } from '@lib/api/db/db';
import { createEmptyFilter } from '@lib/api/db/db-filter';
import {
    TABLE_ID_PROGRAMMING_LANGUAGE_PRINCIPAL,
    type ProgrammingLanguagePrincipal,
} from '@lib/api/db/db-schema';
import type { IDbTableView } from '@lib/api/db/db-view-table-interface';

/**Shared view of the import routines. */
export const programmingLanguagePrincipalTable: IDbTableView<ProgrammingLanguagePrincipal> =
    db.fetchTable(
        TABLE_ID_PROGRAMMING_LANGUAGE_PRINCIPAL,
        createEmptyFilter<ProgrammingLanguagePrincipal>(),
    );
