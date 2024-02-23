import type { DropdownItem } from 'carbon-components-svelte/types/Dropdown/Dropdown.svelte';

/**Helper Functions */
export function TypeNameToType<T, R>(name: T, index: number): R {
    return <R>{ id: index, name: name };
}

/**Database Types */
export interface DatabaseType {
    id: number;
    name: string;
}
export const DATABASE_TYPE_SQLITE: DatabaseType = { id: 0, name: 'SQLite' };
export const DATABASE_TYPE_POSTGRES: DatabaseType = { id: 1, name: 'PostgreSQL' };
export const DATABASE_TYPES: DatabaseType[] = [
    DATABASE_TYPE_SQLITE,
    DATABASE_TYPE_POSTGRES,
] as const;
export type DatabaseTypeId = (typeof DATABASE_TYPES)[number]['id'];
export type DatabaseTypeName = (typeof DATABASE_TYPES)[number]['name'];
export const DATABASE_TYPE_DROPDOWN_ITEMS: DropdownItem[] = DATABASE_TYPES.map(
    (databaseType: DatabaseType) =>
        <DropdownItem>{
            id: databaseType.id,
            text: databaseType.name,
        },
);

/**Build Localization Division */
export interface LocalizationDivisionType {
    id: number;
    name: string;
}
export const LOCALIZATION_DIVISION_SINGLE: LocalizationDivisionType = {
    id: 0,
    name: 'Single File',
};
export const LOCALIZATION_DIVISION_PER_CONVERSATION: LocalizationDivisionType = {
    id: 1,
    name: 'File Per Conversation',
};
export const LOCALIZATION_DIVISION_TYPES: LocalizationDivisionType[] = [
    LOCALIZATION_DIVISION_SINGLE,
    LOCALIZATION_DIVISION_PER_CONVERSATION,
] as const;
export type LocalizationDivisionTypeId = (typeof LOCALIZATION_DIVISION_TYPES)[number]['id'];
export type LocalizationDivisionTypeName = (typeof LOCALIZATION_DIVISION_TYPES)[number]['name'];
export const LOCALIZATION_DIVISION_DROPDOWN_ITEMS: DropdownItem[] = LOCALIZATION_DIVISION_TYPES.map(
    (divisionType: LocalizationDivisionType) =>
        <DropdownItem>{
            id: divisionType.id,
            text: divisionType.name,
        },
);

/**Build Localization Format */
export interface LocalizationFormatType {
    id: number;
    name: string;
}
export const LOCALIZATION_FORMAT_CSV: LocalizationFormatType = { id: 0, name: 'CSV' };
export const LOCALIZATION_FORMAT_TYPES: LocalizationFormatType[] = [
    LOCALIZATION_FORMAT_CSV,
] as const;
export type LocalizationFormatTypeId = (typeof LOCALIZATION_FORMAT_TYPES)[number]['id'];
export type LocalizationFormatTypeName = (typeof LOCALIZATION_FORMAT_TYPES)[number]['name'];
export const LOCALIZATION_FORMAT_DROPDOWN_ITEMS: DropdownItem[] = LOCALIZATION_FORMAT_TYPES.map(
    (formatType: LocalizationFormatType) =>
        <DropdownItem>{
            id: formatType.id,
            text: formatType.name,
        },
);
