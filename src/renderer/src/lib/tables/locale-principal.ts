import { type LocalePrincipal } from '@common/common-schema';
import { TABLE_LOCALE_PRINCIPAL } from '@common/common-types';
import { db } from '@lib/api/db/db';
import { createEmptyFilter } from '@lib/api/db/db-filter';
import type { IDbRowView } from '@lib/api/db/db-view-row-interface';
import type { IDbTableView } from '@lib/api/db/db-view-table-interface';

/**Shared view of the principal locale. */
export const localePrincipalTableView: IDbTableView<LocalePrincipal> = db.fetchTable(
    TABLE_LOCALE_PRINCIPAL,
    createEmptyFilter(),
);

export function getLocalePrincipal(
    localePrincipals: IDbRowView<LocalePrincipal>[],
): IDbRowView<LocalePrincipal> {
    if (!localePrincipals || localePrincipals.length !== 1) return undefined;
    return localePrincipals[0];
}
