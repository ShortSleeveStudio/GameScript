import { db } from '@lib/api/db/db';
import { createEmptyFilter } from '@lib/api/db/db-filter';
import {
    PROGRAMMING_LANGUAGE_ID_CS,
    TABLE_ID_PROGRAMMING_LANGUAGE_PRINCIPAL,
    type ProgrammingLanguageId,
    type ProgrammingLanguagePrincipal,
} from '@lib/api/db/db-schema';
import type { IDbRowView } from '@lib/api/db/db-view-row-interface';
import type { IsLoading } from '@lib/stores/utility/is-loading';
import { TableAndRowStore, type TableAndRows } from '@lib/stores/utility/table-and-row-store';
import { get, writable, type Writable } from 'svelte/store';

/**Shared view of principal programming language table. */
export const programmingLanguagePrincipal: TableAndRowStore<ProgrammingLanguagePrincipal> =
    new TableAndRowStore<ProgrammingLanguagePrincipal>(
        db,
        TABLE_ID_PROGRAMMING_LANGUAGE_PRINCIPAL,
        createEmptyFilter<ProgrammingLanguagePrincipal>(),
    );

// TODO: https://svelte-5-preview.vercel.app/status
export let programmingLanguagePrincipalIsLoading: IsLoading;
export let programmingLanguagePrincipaRow: IDbRowView<ProgrammingLanguagePrincipal>;
export const programmingLanguagePrincipalId: Writable<ProgrammingLanguageId> = writable(
    PROGRAMMING_LANGUAGE_ID_CS,
);

programmingLanguagePrincipal.subscribe(
    (tableAndRows: TableAndRows<ProgrammingLanguagePrincipal>) => {
        // There should only really ever be one row
        for (let i = 0; i < tableAndRows.rows.length; i++) {
            programmingLanguagePrincipaRow = tableAndRows.rows[i];
            programmingLanguagePrincipalId.set(get(programmingLanguagePrincipaRow).principal);
            programmingLanguagePrincipalIsLoading = programmingLanguagePrincipaRow.isLoading;
            break;
        }
    },
);
