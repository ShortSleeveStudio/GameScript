import { type Localization, type Node } from '@lib/api/db/db-schema';
import type { IDbRowView } from '@lib/api/db/db-view-row-interface';
import type { IDbTableView } from '@lib/api/db/db-view-table-interface';

export interface NodeData {
    rowView: IDbRowView<Node>;
    localizations: IDbTableView<Localization>;
}
