import type { PropertyTemplate } from '@common/common-schema';
import { TABLE_NODE_PROPERTY_TEMPLATES } from '@common/common-types';
import { db } from '@lib/api/db/db';
import { createFilter } from '@lib/api/db/db-filter';
import { ASC } from '@lib/api/db/db-filter-interface';
import type { IDbTableView } from '@lib/api/db/db-view-table-interface';

/**Shared view of all node property templates. */
export const nodePropertyTemplates: IDbTableView<PropertyTemplate> = db.fetchTable(
    TABLE_NODE_PROPERTY_TEMPLATES,
    createFilter<PropertyTemplate>().orderBy('id', ASC).build(),
);
