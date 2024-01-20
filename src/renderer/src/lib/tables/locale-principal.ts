import { db } from '@lib/api/db/db';
import { createEmptyFilter } from '@lib/api/db/db-filter';
import { TABLE_ID_LOCALE_PRINCIPAL, type LocalePrincipal } from '@lib/api/db/db-schema';
import type { IDbRowView } from '@lib/api/db/db-view-row-interface';
import type { IDbTableView } from '@lib/api/db/db-view-table-interface';

/**Shared view of the principal locale. */
const localePrincipalTableView: IDbTableView<LocalePrincipal> = db.fetchTable(
    TABLE_ID_LOCALE_PRINCIPAL,
    createEmptyFilter(),
);

export let localePrincipalRowView: IDbRowView<LocalePrincipal>;

// TODO
// https://svelte-5-preview.vercel.app/status
// These single row tables could be stateful variables of a class
localePrincipalTableView.subscribe((rowViews: IDbRowView<LocalePrincipal>[]) => {
    if (rowViews.length === 1) {
        localePrincipalRowView = rowViews[0];
    }
});
