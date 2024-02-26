import { type ProgrammingLanguagePrincipal } from '@common/common-schema';
import { TABLE_PROGRAMMING_LANGUAGE_PRINCIPAL } from '@common/common-types';
import { db } from '@lib/api/db/db';
import { createFilter } from '@lib/api/db/db-filter';
import { ASC } from '@lib/api/db/db-filter-interface';
import type { IDbTableView } from '@lib/api/db/db-view-table-interface';

/**Shared view of the import routines. */
export const programmingLanguagePrincipalTable: IDbTableView<ProgrammingLanguagePrincipal> =
    db.fetchTable(
        TABLE_PROGRAMMING_LANGUAGE_PRINCIPAL,
        createFilter<ProgrammingLanguagePrincipal>().orderBy('id', ASC).build(),
    );
