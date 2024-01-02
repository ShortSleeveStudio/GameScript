import { db } from '@lib/api/db/db';
import { createEmptyFilter } from '@lib/api/db/db-filter';
import {
    TABLE_NAME_PROGRAMMING_LANGUAGE_PRINCIPAL,
    type ProgrammingLanguagePrincipal,
} from '@lib/api/db/db-schema';
import { TableAndRowStore } from '@lib/stores/utility/table-and-row-store';

/**Shared view of selected programming language table. */
export const programmingLanguagePrincipal: TableAndRowStore<ProgrammingLanguagePrincipal> =
    new TableAndRowStore<ProgrammingLanguagePrincipal>(
        db,
        TABLE_NAME_PROGRAMMING_LANGUAGE_PRINCIPAL,
        createEmptyFilter<ProgrammingLanguagePrincipal>(),
    );
