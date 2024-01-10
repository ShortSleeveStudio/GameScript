import { db } from '@lib/api/db/db';
import { createFilter } from '@lib/api/db/db-filter';
import {
    TABLE_ID_LOCALIZATIONS,
    TABLE_ID_LOCALIZATION_TABLES,
    type Localization,
    type LocalizationTable,
} from '@lib/api/db/db-schema';
import type { IDbRowView } from '@lib/api/db/db-view-row-interface';
import type { IDbTableView } from '@lib/api/db/db-view-table-interface';

/**Shared view of the actor localization table.  */
const actorLocalizationTable: IDbTableView<LocalizationTable> = db.fetchTable(
    TABLE_ID_LOCALIZATION_TABLES,
    createFilter<LocalizationTable>().where('isSystemCreated').is(true).build(),
);

export let actorLocalizations: IDbTableView<Localization> | undefined;
export let actorLocalizationTableRowView: IDbRowView<LocalizationTable> | undefined;

// TODO
// https://svelte-5-preview.vercel.app/status
// These single row tables could be stateful variables of a class
actorLocalizationTable.subscribe((rowViews: IDbRowView<LocalizationTable>[]) => {
    if (rowViews.length === 1) {
        actorLocalizationTableRowView = rowViews[0];
        actorLocalizations = db.fetchTable(
            TABLE_ID_LOCALIZATIONS,
            createFilter<Localization>()
                .where('parent')
                .is(actorLocalizationTableRowView.id)
                .build(),
        );
    }
});
