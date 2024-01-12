import { db } from '@lib/api/db/db';
import { createFilter } from '@lib/api/db/db-filter';
import { TABLE_ID_LOCALES, type Locale } from '@lib/api/db/db-schema';
import type { IDbRowView } from '@lib/api/db/db-view-row-interface';
import type { IDbTableView } from '@lib/api/db/db-view-table-interface';

/**Shared view of the default locale.  */
const defaultLocaleTableView: IDbTableView<Locale> = db.fetchTable(
    TABLE_ID_LOCALES,
    createFilter<Locale>().where('isSystemCreated').is(true).build(),
);

export let defaultLocaleRowView: IDbRowView<Locale> | undefined;

// TODO
// https://svelte-5-preview.vercel.app/status
// These single row tables could be stateful variables of a class
defaultLocaleTableView.subscribe((rowViews: IDbRowView<Locale>[]) => {
    if (rowViews.length === 1) {
        defaultLocaleRowView = rowViews[0];
    }
});
