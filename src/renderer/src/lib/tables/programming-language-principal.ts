import { type ProgrammingLanguagePrincipal } from '@common/common-schema';
import { TABLE_PROGRAMMING_LANGUAGE_PRINCIPAL } from '@common/common-types';
import { db } from '@lib/api/db/db';
import { createFilter } from '@lib/api/db/db-filter';
import { ASC } from '@lib/api/db/db-filter-interface';
import type { IDbRowView } from '@lib/api/db/db-view-row-interface';
import type { IDbTableView } from '@lib/api/db/db-view-table-interface';

export const programmingLanguagePrincipalTable: IDbTableView<ProgrammingLanguagePrincipal> =
    db.fetchTable(
        TABLE_PROGRAMMING_LANGUAGE_PRINCIPAL,
        createFilter<ProgrammingLanguagePrincipal>().orderBy('id', ASC).build(),
    );

export let programmingLanguagePrincipal: IDbRowView<ProgrammingLanguagePrincipal>;

programmingLanguagePrincipalTable.subscribe((rows: IDbRowView<ProgrammingLanguagePrincipal>[]) => {
    if (rows && rows.length === 1) {
        programmingLanguagePrincipal = rows[0];
    } else {
        programmingLanguagePrincipal = undefined;
    }
});
