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

/**Database Tables */
export interface DatabaseTableType {
    id: number;
    name: string;
}
export const TABLE_TABLES: DatabaseTableType = { id: 0, name: 'tables' };
export const TABLE_AUTO_COMPLETES: DatabaseTableType = { id: 1, name: 'auto_completes' };
export const TABLE_PROGRAMMING_LANGUAGES: DatabaseTableType = {
    id: 2,
    name: 'programming_languages',
};
export const TABLE_PROGRAMMING_LANGUAGE_PRINCIPAL: DatabaseTableType = {
    id: 3,
    name: 'programming_language_principal',
};
export const TABLE_ROUTINE_TYPES: DatabaseTableType = { id: 4, name: 'routine_types' };
export const TABLE_ROUTINES: DatabaseTableType = { id: 5, name: 'routines' };
export const TABLE_FILTERS: DatabaseTableType = { id: 6, name: 'filters' };
export const TABLE_CONVERSATIONS: DatabaseTableType = { id: 7, name: 'conversations' };
export const TABLE_LOCALES: DatabaseTableType = { id: 8, name: 'locales' };
export const TABLE_LOCALE_PRINCIPAL: DatabaseTableType = { id: 9, name: 'locale_principal' };
export const TABLE_LOCALIZATIONS: DatabaseTableType = { id: 10, name: 'localizations' };
export const TABLE_ACTORS: DatabaseTableType = { id: 11, name: 'actors' };
export const TABLE_ACTOR_PRINCIPAL: DatabaseTableType = { id: 12, name: 'actor_principal' };
export const TABLE_NODES: DatabaseTableType = { id: 13, name: 'nodes' };
export const TABLE_EDGES: DatabaseTableType = { id: 14, name: 'edges' };
export const DATABASE_TABLES: DatabaseTableType[] = [
    TABLE_TABLES,
    TABLE_AUTO_COMPLETES,
    TABLE_PROGRAMMING_LANGUAGES,
    TABLE_PROGRAMMING_LANGUAGE_PRINCIPAL,
    TABLE_ROUTINE_TYPES,
    TABLE_ROUTINES,
    TABLE_FILTERS,
    TABLE_CONVERSATIONS,
    TABLE_LOCALES,
    TABLE_LOCALE_PRINCIPAL,
    TABLE_LOCALIZATIONS,
    TABLE_ACTORS,
    TABLE_ACTOR_PRINCIPAL,
    TABLE_NODES,
    TABLE_EDGES,
] as const;
export type DatabaseTableId = (typeof DATABASE_TABLES)[number]['id'];
export type DatabaseTableName = (typeof DATABASE_TABLES)[number]['name'];

/**Database Field Types */
export interface FieldType {
    id: number;
    name: string;
}
export const FIELD_TYPE_DECIMAL: FieldType = { id: 0, name: 'Decimal' };
export const FIELD_TYPE_INTEGER: FieldType = { id: 1, name: 'Integer' };
export const FIELD_TYPE_TEXT: FieldType = { id: 2, name: 'Text' };
export const FIELD_TYPES: FieldType[] = [
    FIELD_TYPE_DECIMAL,
    FIELD_TYPE_INTEGER,
    FIELD_TYPE_TEXT,
] as const;
export type FieldTypeId = (typeof FIELD_TYPES)[number]['id'];
export type FieldTypeName = (typeof FIELD_TYPES)[number]['name'];

/**Programming Languages */
export interface ProgrammingLanguageType {
    id: number;
    name: string;
}
export const PROGRAMMING_LANGUAGE_CS: ProgrammingLanguageType = { id: 0, name: 'C#' };
export const PROGRAMMING_LANGUAGE_CPP: ProgrammingLanguageType = { id: 0, name: 'C++' };
export const PROGRAMMING_LANGUAGE_TYPES: ProgrammingLanguageType[] = [
    PROGRAMMING_LANGUAGE_CS,
    PROGRAMMING_LANGUAGE_CPP,
] as const;
export type ProgrammingLanguageId = (typeof PROGRAMMING_LANGUAGE_TYPES)[number]['id'];
export type ProgrammingLanguageName = (typeof PROGRAMMING_LANGUAGE_TYPES)[number]['name'];
export const PROGRAMMING_LANGUAGE_DROPDOWN_ITEMS: DropdownItem[] = PROGRAMMING_LANGUAGE_TYPES.map(
    (languageType: ProgrammingLanguageType) =>
        <DropdownItem>{
            id: languageType.id,
            text: languageType.name,
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
