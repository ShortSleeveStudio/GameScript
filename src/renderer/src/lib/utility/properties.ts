// TODO
// import {
//     PROPERTY_FK_COLUMN_NAME_ACTORS,
//     PROPERTY_FK_COLUMN_NAME_CONVERSATIONS,
//     PROPERTY_FK_COLUMN_NAME_NODES,
//     TABLE_ID_ACTORS,
//     TABLE_ID_CONVERSATIONS,
//     type DatabaseTableId,
// } from '@lib/api/db/db-schema';
// import type { DropdownItem } from 'carbon-components-svelte/types/Dropdown/Dropdown.svelte';

// export function tableIdToFkColumnName(tableId: DatabaseTableId): string {
//     return tableId === TABLE_ID_ACTORS
//         ? PROPERTY_FK_COLUMN_NAME_ACTORS
//         : tableId === TABLE_ID_CONVERSATIONS
//           ? PROPERTY_FK_COLUMN_NAME_CONVERSATIONS
//           : PROPERTY_FK_COLUMN_NAME_NODES;
// }

// /**Helper to convert default property ids to column names. */
// export function defaultPropertyIdToColumn(id: number): string {
//     return PROPERTY_COLUMN_PREFIX + id;
// }

// export const PROPERTY_COLUMN_PREFIX = 'property_';

// export const BOOLEAN_DROP_DOWN_ITEMS: DropdownItem[] = [
//     { id: 1, text: 'True' },
//     { id: 0, text: 'False' },
// ];
