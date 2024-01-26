import type { Filter } from '@lib/api/db/db-schema';
import type { IDbRowView } from '@lib/api/db/db-view-row-interface';

export interface FinderHeaderParams {
    filterRowView: IDbRowView<Filter>;
}
