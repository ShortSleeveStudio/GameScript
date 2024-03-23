import { type Locale } from '@common/common-schema';
import { TABLE_LOCALES } from '@common/common-types';
import { db } from '@lib/api/db/db';
import { createFilter } from '@lib/api/db/db-filter';
import type { IDbRowView } from '@lib/api/db/db-view-row-interface';
import type { IDbTableView } from '@lib/api/db/db-view-table-interface';

/**Shared view of the system created locale.  */
const systemCreatedLocaleTableView: IDbTableView<Locale> = db.fetchTable(
    TABLE_LOCALES,
    createFilter<Locale>().where().column('is_system_created').eq(true).endWhere().build(),
);

export let systemCreatedLocaleRowView: IDbRowView<Locale>;

// TODO
// https://svelte-5-preview.vercel.app/status
// These single row tables could be stateful variables of a class
systemCreatedLocaleTableView.subscribe((rowViews: IDbRowView<Locale>[]) => {
    if (rowViews.length === 1 && systemCreatedLocaleRowView !== rowViews[0]) {
        systemCreatedLocaleRowView = rowViews[0];
    }
});
