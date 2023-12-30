import { db } from '@lib/api/db/db';
import { createFilter } from '@lib/api/db/db-filter';
import type { FilterBuilder } from '@lib/api/db/db-filter-interface';
import {
    NODE_TYPE_ID_DEFAULT_FIELD,
    TABLE_NAME_NODES,
    type NodeRow,
    type NodeTypeName,
} from '@lib/api/db/db-schema';
import type { IDbTableView } from '@lib/api/db/db-view-table-interface';

/**Shared view of conversation default fields. */
export const defaultFieldsActor: IDbTableView<NodeRow> = db.fetchTable(
    TABLE_NAME_NODES,
    nodeFilter()
        .where('name')
        .is(<NodeTypeName>'Actor')
        .build(),
);

export const defaultFieldsAutoComplete: IDbTableView<NodeRow> = db.fetchTable(
    TABLE_NAME_NODES,
    nodeFilter()
        .where('name')
        .is(<NodeTypeName>'Auto-Complete')
        .build(),
);

export const defaultFieldsConversation: IDbTableView<NodeRow> = db.fetchTable(
    TABLE_NAME_NODES,
    nodeFilter()
        .where('name')
        .is(<NodeTypeName>'Conversation')
        .build(),
);

export const defaultFieldsDialogue: IDbTableView<NodeRow> = db.fetchTable(
    TABLE_NAME_NODES,
    nodeFilter()
        .where('name')
        .is(<NodeTypeName>'Dialogue')
        .build(),
);

export const defaultFieldsLocale: IDbTableView<NodeRow> = db.fetchTable(
    TABLE_NAME_NODES,
    nodeFilter()
        .where('name')
        .is(<NodeTypeName>'Locale')
        .build(),
);

export const defaultFieldsLocalizationTable: IDbTableView<NodeRow> = db.fetchTable(
    TABLE_NAME_NODES,
    nodeFilter()
        .where('name')
        .is(<NodeTypeName>'Localization Table')
        .build(),
);

export const defaultFieldsLocalization: IDbTableView<NodeRow> = db.fetchTable(
    TABLE_NAME_NODES,
    nodeFilter()
        .where('name')
        .is(<NodeTypeName>'Localization')
        .build(),
);

export const defaultFieldsProgrammingLanguage: IDbTableView<NodeRow> = db.fetchTable(
    TABLE_NAME_NODES,
    nodeFilter()
        .where('name')
        .is(<NodeTypeName>'Programming Language')
        .build(),
);

export const defaultFieldsRoutine: IDbTableView<NodeRow> = db.fetchTable(
    TABLE_NAME_NODES,
    nodeFilter()
        .where('name')
        .is(<NodeTypeName>'Routine')
        .build(),
);

function nodeFilter(): FilterBuilder<NodeRow> {
    return createFilter<NodeRow>().where('type').is(NODE_TYPE_ID_DEFAULT_FIELD).and();
}
