import { db } from '@lib/api/db/db';
import { createFilter } from '@lib/api/db/db-filter';
import { TABLE_ID_LOCALES, type Locale } from '@lib/api/db/db-schema';
import type { IDbRowView } from '@lib/api/db/db-view-row-interface';
import type { IDbTableView } from '@lib/api/db/db-view-table-interface';

/**Shared view of the system created locale.  */
const systemCreatedRoutineTableView: IDbTableView<Locale> = db.fetchTable(
    TABLE_ID_LOCALES,
    createFilter<Locale>().where('isSystemCreated').is(true).build(),
);

export let systemCreatedRoutineRowView: IDbRowView<Locale>;

// TODO
// https://svelte-5-preview.vercel.app/status
// These single row tables could be stateful variables of a class
systemCreatedRoutineTableView.subscribe((rowViews: IDbRowView<Locale>[]) => {
    if (rowViews.length === 1) {
        systemCreatedRoutineRowView = rowViews[0];
    }
});

// import { localeIdToColumn } from '@lib/utility/locale';
// export function getDefaultLocaleName(): string {
//     if (defaultLocaleRowView === undefined) throw new Error('Default locale is not loaded');
//     return localeIdToColumn(defaultLocaleRowView.id);
// }
