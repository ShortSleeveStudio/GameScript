import { type Edge, type Localization, type Node } from '@common/common-schema';
import type { IDbRowView } from '@lib/api/db/db-view-row-interface';
import type { IDbTableView } from '@lib/api/db/db-view-table-interface';
import type { ElkExtendedEdge } from '@lib/vendor/elkjs/elk-api';

export interface NodeData extends Record<string, unknown> {
    rowView: IDbRowView<Node>;
    localizations: IDbTableView<Localization>;
    selected: boolean;
}

export interface EdgeData extends Record<string, unknown> {
    rowView: IDbRowView<Edge>;
    localizations: IDbTableView<Localization>;
    selected: boolean;
    elkEdge: ElkExtendedEdge;
}
