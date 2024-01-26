import { db } from '@lib/api/db/db';
import { createFilter } from '@lib/api/db/db-filter';
import { ASC } from '@lib/api/db/db-filter-interface';
import {
    ACTOR_CONVERSATION_ID,
    TABLE_ID_CONVERSATIONS,
    TABLE_ID_LOCALIZATIONS,
    type Conversation,
    type Localization,
} from '@lib/api/db/db-schema';
import type { IDbRowView } from '@lib/api/db/db-view-row-interface';
import type { IDbTableView } from '@lib/api/db/db-view-table-interface';

/**Shared view of the actor conversation table. */
const actorConversationTableView: IDbTableView<Conversation> = db.fetchTable(
    TABLE_ID_CONVERSATIONS,
    createFilter<Conversation>()
        .where()
        .column('id')
        .is(ACTOR_CONVERSATION_ID)
        .endWhere()
        .orderBy('id', ASC)
        .build(),
);

export let actorLocalizations: IDbTableView<Localization> | undefined;
export let actorConversationRowView: IDbRowView<Conversation> | undefined;

// TODO
// https://svelte-5-preview.vercel.app/status
// These single row tables could be stateful variables of a class
actorConversationTableView.subscribe((rowViews: IDbRowView<Conversation>[]) => {
    if (rowViews.length === 1 && actorConversationRowView !== rowViews[0]) {
        actorConversationRowView = rowViews[0];
        actorLocalizations = db.fetchTable(
            TABLE_ID_LOCALIZATIONS,
            createFilter<Localization>()
                .where()
                .column('parent')
                .is(actorConversationRowView.id)
                .endWhere()
                .orderBy('id', ASC)
                .build(),
        );
    }
});
