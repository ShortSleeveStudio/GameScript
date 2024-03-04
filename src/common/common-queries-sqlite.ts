import {
    TABLE_ACTORS,
    TABLE_ACTOR_PRINCIPAL,
    TABLE_AUTO_COMPLETES,
    TABLE_CONVERSATIONS,
    TABLE_EDGES,
    TABLE_FILTERS,
    TABLE_LOCALES,
    TABLE_LOCALE_PRINCIPAL,
    TABLE_LOCALIZATIONS,
    TABLE_NODES,
    TABLE_PROGRAMMING_LANGUAGES,
    TABLE_PROGRAMMING_LANGUAGE_PRINCIPAL,
    TABLE_ROUTINES,
    TABLE_ROUTINE_TYPES,
    type DatabaseTableType,
} from './common-types';

///
/// Constants
///
export type TableCreationQueryCreator = (isExport: boolean) => string;
export interface TableForeignKeyInfo {
    fieldName: string;
    foreignTable: DatabaseTableType;
}
export interface TableCreateInfo {
    type: DatabaseTableType;
    fkInfo: TableForeignKeyInfo[];
    creator: TableCreationQueryCreator;
}
export const EXPORT_ORIGINAL_ID_COLUMN_NAME: string = 'originalId';
export const EXPORT_DUMMY_TABLE_PREFIX: string = '_DUMMY';
const DEFAULT_LOCALE_ID: number = 0;
const EXPORT_ORIGINAL_ID_COLUMN_CLAUSE: string = `"${EXPORT_ORIGINAL_ID_COLUMN_NAME}"	INTEGER,`;

///
/// Table Definitions
///
export interface ColumnDefinition {
    name: string;

    // TRY:
    // type OptionsFlags<Type> = {
    //     [Property in keyof Type]: boolean;
    //   };
    // TODO - HERE
}
export interface TableDefinition {
    name: string;
    columns: ColumnDefinition[];
}

///
/// Table Creation
///
export function createTableAutoCompletes(isHelperDb: boolean = false): string {
    return `
	CREATE TABLE IF NOT EXISTS "${
        TABLE_AUTO_COMPLETES.name + (isHelperDb ? EXPORT_DUMMY_TABLE_PREFIX : '')
    }" (
		"id"	INTEGER,
		"name"	TEXT,
		"icon"	INTEGER NOT NULL,
		"rule"	INTEGER NOT NULL,
		"insertion"	TEXT,
		"documentation"	TEXT,
		${isHelperDb ? EXPORT_ORIGINAL_ID_COLUMN_CLAUSE : ''}
		PRIMARY KEY("id" AUTOINCREMENT)
	);
	`;
}
export function createTableProgrammingLanguages(isHelperDb: boolean = false): string {
    return `
    CREATE TABLE IF NOT EXISTS "${
        TABLE_PROGRAMMING_LANGUAGES.name + (isHelperDb ? EXPORT_DUMMY_TABLE_PREFIX : '')
    }" (
        "id"    INTEGER,
        "name"  TEXT NOT NULL UNIQUE,
        ${isHelperDb ? EXPORT_ORIGINAL_ID_COLUMN_CLAUSE : ''}
        PRIMARY KEY("id" AUTOINCREMENT)
    );`;
}
export function createTableProgrammingLanguagePrincipal(isHelperDb: boolean = false): string {
    return `
    CREATE TABLE IF NOT EXISTS "${
        TABLE_PROGRAMMING_LANGUAGE_PRINCIPAL.name + (isHelperDb ? EXPORT_DUMMY_TABLE_PREFIX : '')
    }" (
        "id"    INTEGER,
        "principal" INTEGER,
        ${isHelperDb ? EXPORT_ORIGINAL_ID_COLUMN_CLAUSE : ''}
        PRIMARY KEY("id" AUTOINCREMENT)
        ${
            isHelperDb
                ? ''
                : `
        , FOREIGN KEY("principal") REFERENCES "${
            TABLE_PROGRAMMING_LANGUAGES.name + (isHelperDb ? EXPORT_DUMMY_TABLE_PREFIX : '')
        }"
        `
        }
    );`;
}
export function createTableFilters(isHelperDb: boolean = false): string {
    return `
    CREATE TABLE IF NOT EXISTS "${
        TABLE_FILTERS.name + (isHelperDb ? EXPORT_DUMMY_TABLE_PREFIX : '')
    }" (
        "id"    INTEGER,
        "name"  TEXT NOT NULL,
        "notes" TEXT,
        ${isHelperDb ? EXPORT_ORIGINAL_ID_COLUMN_CLAUSE : ''}
        PRIMARY KEY("id" AUTOINCREMENT)
    );`;
}
export function createTableConversations(isHelperDb: boolean = false): string {
    return `
    CREATE TABLE IF NOT EXISTS "${
        TABLE_CONVERSATIONS.name + (isHelperDb ? EXPORT_DUMMY_TABLE_PREFIX : '')
    }" (
        "id"    INTEGER,
        "name"  TEXT NOT NULL,
        "isSystemCreated"   INTEGER NOT NULL,
        "notes" TEXT,
        "isDeleted" INTEGER NOT NULL,
        "layoutAuto"    INTEGER NOT NULL,
        "layoutVertical"    INTEGER NOT NULL,
        ${isHelperDb ? EXPORT_ORIGINAL_ID_COLUMN_CLAUSE : ''}
        PRIMARY KEY("id" AUTOINCREMENT)
    );`;
}
export function createTableRoutineTypes(isHelperDb: boolean = false): string {
    return `
    CREATE TABLE IF NOT EXISTS "${
        TABLE_ROUTINE_TYPES.name + (isHelperDb ? EXPORT_DUMMY_TABLE_PREFIX : '')
    }" (
        "id"    INTEGER,
        "name"  TEXT NOT NULL UNIQUE,
        ${isHelperDb ? EXPORT_ORIGINAL_ID_COLUMN_CLAUSE : ''}
        PRIMARY KEY("id" AUTOINCREMENT)
    );`;
}
export function createTableRoutines(isHelperDb: boolean = false): string {
    return `
    CREATE TABLE IF NOT EXISTS "${
        TABLE_ROUTINES.name + (isHelperDb ? EXPORT_DUMMY_TABLE_PREFIX : '')
    }" (
        "id"    INTEGER,
        "name"  TEXT,
        "code"  TEXT,
        "type"  INTEGER NOT NULL,
        "notes" TEXT,
        "isSystemCreated"   INTEGER NOT NULL,
        "parent"    INTEGER,
        ${isHelperDb ? EXPORT_ORIGINAL_ID_COLUMN_CLAUSE : ''}
        PRIMARY KEY("id" AUTOINCREMENT)
        ${
            isHelperDb
                ? ''
                : `
        , FOREIGN KEY("type") REFERENCES "${TABLE_ROUTINE_TYPES.name}"
        , FOREIGN KEY("parent") REFERENCES "${TABLE_CONVERSATIONS.name}"
        `
        }
    );`;
}
export function createTableLocalizations(isHelperDb: boolean = false): string {
    return `
    CREATE TABLE IF NOT EXISTS "${
        TABLE_LOCALIZATIONS.name + (isHelperDb ? EXPORT_DUMMY_TABLE_PREFIX : '')
    }" (
        "id"    INTEGER,
        "name"  TEXT,
        "parent"    INTEGER,
        "isSystemCreated"   INTEGER NOT NULL,
        ${isHelperDb ? EXPORT_ORIGINAL_ID_COLUMN_CLAUSE : ''}
        PRIMARY KEY("id" AUTOINCREMENT)
        ${
            isHelperDb
                ? ''
                : `
        , FOREIGN KEY("parent") REFERENCES "${TABLE_CONVERSATIONS.name}"
        `
        }
    );`;
}
export function createTableLocales(isHelperDb: boolean = false): string {
    return `
    CREATE TABLE IF NOT EXISTS "${
        TABLE_LOCALES.name + (isHelperDb ? EXPORT_DUMMY_TABLE_PREFIX : '')
    }" (
        "id"    INTEGER,
        "name"  TEXT NOT NULL,
        "isSystemCreated"   INTEGER NOT NULL,
        "localizedName"   INTEGER NOT NULL,
        ${isHelperDb ? EXPORT_ORIGINAL_ID_COLUMN_CLAUSE : ''}
        PRIMARY KEY("id" AUTOINCREMENT)
        ${
            isHelperDb
                ? ''
                : `
        , FOREIGN KEY("localizedName") REFERENCES "${TABLE_LOCALIZATIONS.name}"
        `
        }
    );`;
}
export function createTableLocalePrincipal(isHelperDb: boolean = false): string {
    return `
    CREATE TABLE IF NOT EXISTS "${
        TABLE_LOCALE_PRINCIPAL.name + (isHelperDb ? EXPORT_DUMMY_TABLE_PREFIX : '')
    }" (
        "id"    INTEGER,
        "principal" INTEGER,
        ${isHelperDb ? EXPORT_ORIGINAL_ID_COLUMN_CLAUSE : ''}
        PRIMARY KEY("id" AUTOINCREMENT)
        ${
            isHelperDb
                ? ''
                : `
        , FOREIGN KEY("principal") REFERENCES "${TABLE_LOCALES.name}"
        `
        }
    );`;
}
export function createTableActors(isHelperDb: boolean = false): string {
    return `
    CREATE TABLE IF NOT EXISTS "${
        TABLE_ACTORS.name + (isHelperDb ? EXPORT_DUMMY_TABLE_PREFIX : '')
    }" (
        "id"    INTEGER,
        "name"  TEXT NOT NULL,
        "color" TEXT NOT NULL,
        "localizedName" INTEGER NOT NULL,
        "isSystemCreated"   INTEGER NOT NULL,
        ${isHelperDb ? EXPORT_ORIGINAL_ID_COLUMN_CLAUSE : ''}
        PRIMARY KEY("id" AUTOINCREMENT)
        ${
            isHelperDb
                ? ''
                : `
        , FOREIGN KEY("localizedName") REFERENCES "${TABLE_LOCALIZATIONS.name}"
        `
        }
    );`;
}
export function createTableActorPrincipal(isHelperDb: boolean = false): string {
    return `
    CREATE TABLE IF NOT EXISTS "${
        TABLE_ACTOR_PRINCIPAL.name + (isHelperDb ? EXPORT_DUMMY_TABLE_PREFIX : '')
    }" (
        "id"    INTEGER,
        "principal" INTEGER,
        ${isHelperDb ? EXPORT_ORIGINAL_ID_COLUMN_CLAUSE : ''}
        PRIMARY KEY("id" AUTOINCREMENT)
        ${
            isHelperDb
                ? ''
                : `
        , FOREIGN KEY("principal") REFERENCES "${TABLE_ACTORS.name}"
        `
        }
    );`;
}
export function createTableNodes(isHelperDb: boolean = false): string {
    return `
    CREATE TABLE IF NOT EXISTS "${
        TABLE_NODES.name + (isHelperDb ? EXPORT_DUMMY_TABLE_PREFIX : '')
    }" (
        "id"    INTEGER,
        "name"  TEXT,
        "parent"    INTEGER NOT NULL,
        "actor" INTEGER NOT NULL,
        "uiResponseText"    INTEGER NOT NULL,
        "voiceText" INTEGER NOT NULL,
        "condition" INTEGER NOT NULL,
        "code"  INTEGER NOT NULL,
        "codeOverride"  INTEGER,
        "preventResponse"   INTEGER DEFAULT 0,
        "notes" TEXT,
        "isSystemCreated"   INTEGER NOT NULL,
        "link"  INTEGER,
        "type"  TEXT NOT NULL,
        "positionX" NUMERIC DEFAULT 0,
        "positionY" NUMERIC DEFAULT 0,
        ${isHelperDb ? EXPORT_ORIGINAL_ID_COLUMN_CLAUSE : ''}
        PRIMARY KEY("id" AUTOINCREMENT)
        ${
            isHelperDb
                ? ''
                : `
        , FOREIGN KEY("actor") REFERENCES "${TABLE_ACTORS.name}"
        , FOREIGN KEY("uiResponseText") REFERENCES "${TABLE_LOCALIZATIONS.name}"
        , FOREIGN KEY("voiceText") REFERENCES "${TABLE_LOCALIZATIONS.name}"
        , FOREIGN KEY("parent") REFERENCES "${TABLE_CONVERSATIONS.name}"
        , FOREIGN KEY("condition") REFERENCES "${TABLE_ROUTINES.name}"
        , FOREIGN KEY("code") REFERENCES "${TABLE_ROUTINES.name}"
        , FOREIGN KEY("link") REFERENCES "${TABLE_NODES.name}"
        `
        }
    );`;
}
export function createTableEdges(isHelperDb: boolean = false): string {
    return `
    CREATE TABLE IF NOT EXISTS "${
        TABLE_EDGES.name + (isHelperDb ? EXPORT_DUMMY_TABLE_PREFIX : '')
    }" (
        "id"    INTEGER,
        "name"  TEXT,
        "parent"    INTEGER NOT NULL,
        "priority"  INTEGER DEFAULT 0,
        "notes" TEXT,
        "type"  TEXT NOT NULL,
        "source"    INTEGER NOT NULL,
        "target"    INTEGER NOT NULL,
        ${isHelperDb ? EXPORT_ORIGINAL_ID_COLUMN_CLAUSE : ''}

        UNIQUE(parent, source, target),
        PRIMARY KEY("id" AUTOINCREMENT)
        ${
            isHelperDb
                ? ''
                : `
        , FOREIGN KEY("parent") REFERENCES "${TABLE_CONVERSATIONS.name}"
        , FOREIGN KEY("source") REFERENCES "${TABLE_NODES.name}"
        , FOREIGN KEY("target") REFERENCES "${TABLE_NODES.name}"
        `
        }
    );`;
}

export const CREATE_TABLE_INFOS: TableCreateInfo[] = [
    { type: TABLE_AUTO_COMPLETES, creator: createTableAutoCompletes, fkInfo: [] },
    { type: TABLE_PROGRAMMING_LANGUAGES, creator: createTableProgrammingLanguages, fkInfo: [] },
    {
        type: TABLE_PROGRAMMING_LANGUAGE_PRINCIPAL,
        creator: createTableProgrammingLanguagePrincipal,
        fkInfo: [
            <TableForeignKeyInfo>{
                fieldName: 'principal',
                foreignTable: TABLE_PROGRAMMING_LANGUAGES,
            },
        ],
    },
    { type: TABLE_FILTERS, creator: createTableFilters, fkInfo: [] },
    { type: TABLE_CONVERSATIONS, creator: createTableConversations, fkInfo: [] },
    { type: TABLE_ROUTINE_TYPES, creator: createTableRoutineTypes, fkInfo: [] },
    {
        type: TABLE_ROUTINES,
        creator: createTableRoutines,
        fkInfo: [
            <TableForeignKeyInfo>{
                fieldName: 'type',
                foreignTable: TABLE_ROUTINE_TYPES,
            },
            <TableForeignKeyInfo>{
                fieldName: 'parent',
                foreignTable: TABLE_CONVERSATIONS,
            },
        ],
    },
    {
        type: TABLE_LOCALIZATIONS,
        creator: createTableLocalizations,
        fkInfo: [
            <TableForeignKeyInfo>{
                fieldName: 'parent',
                foreignTable: TABLE_CONVERSATIONS,
            },
        ],
    },
    {
        type: TABLE_LOCALES,
        creator: createTableLocales,
        fkInfo: [
            <TableForeignKeyInfo>{
                fieldName: 'localizedName',
                foreignTable: TABLE_LOCALIZATIONS,
            },
        ],
    },
    {
        type: TABLE_LOCALE_PRINCIPAL,
        creator: createTableLocalePrincipal,
        fkInfo: [
            <TableForeignKeyInfo>{
                fieldName: 'principal',
                foreignTable: TABLE_LOCALES,
            },
        ],
    },
    {
        type: TABLE_ACTORS,
        creator: createTableActors,
        fkInfo: [
            <TableForeignKeyInfo>{
                fieldName: 'localizedName',
                foreignTable: TABLE_LOCALIZATIONS,
            },
        ],
    },
    {
        type: TABLE_ACTOR_PRINCIPAL,
        creator: createTableActorPrincipal,
        fkInfo: [
            <TableForeignKeyInfo>{
                fieldName: 'principal',
                foreignTable: TABLE_ACTORS,
            },
        ],
    },
    {
        type: TABLE_NODES,
        creator: createTableNodes,
        fkInfo: [
            <TableForeignKeyInfo>{
                fieldName: 'actor',
                foreignTable: TABLE_ACTORS,
            },
            <TableForeignKeyInfo>{
                fieldName: 'uiResponseText',
                foreignTable: TABLE_LOCALIZATIONS,
            },
            <TableForeignKeyInfo>{
                fieldName: 'voiceText',
                foreignTable: TABLE_LOCALIZATIONS,
            },
            <TableForeignKeyInfo>{
                fieldName: 'parent',
                foreignTable: TABLE_CONVERSATIONS,
            },
            <TableForeignKeyInfo>{
                fieldName: 'condition',
                foreignTable: TABLE_ROUTINES,
            },
            <TableForeignKeyInfo>{
                fieldName: 'code',
                foreignTable: TABLE_ROUTINES,
            },
            <TableForeignKeyInfo>{
                fieldName: 'link',
                foreignTable: TABLE_NODES,
            },
        ],
    },
    {
        type: TABLE_EDGES,
        creator: createTableEdges,
        fkInfo: [
            <TableForeignKeyInfo>{
                fieldName: 'parent',
                foreignTable: TABLE_CONVERSATIONS,
            },
            <TableForeignKeyInfo>{
                fieldName: 'source',
                foreignTable: TABLE_NODES,
            },
            <TableForeignKeyInfo>{
                fieldName: 'target',
                foreignTable: TABLE_NODES,
            },
        ],
    },
];

// ///
// /// Table Initialization
// ///

// let rowIndex: number;
// // Auto-Completes
// // Programming Languages
// const INITIALIZE_PROGRAMMING_LANGUAGES = `
// BEGIN TRANSACTION;
// ${PROGRAMMING_LANGUAGE_TYPES.map(
//     (languageType: ProgrammingLanguage) =>
//         `INSERT OR IGNORE INTO ${TABLE_PROGRAMMING_LANGUAGES.name} (id, name) VALUES (${languageType.id}, '${languageType.name}');`,
// ).join('\n')}
// COMMIT;
// `;
// // Programming Language Principal
// rowIndex = 0;
// const INITIALIZE_PROGRAMMING_LANGUAGE_PRINCIPAL = `
// INSERT OR IGNORE INTO ${
//     TABLE_PROGRAMMING_LANGUAGE_PRINCIPAL.name
// } (id, principal) VALUES (${rowIndex++}, ${PROGRAMMING_LANGUAGE_CS.id});`;
// // Routine Types
// rowIndex = 0;
// const INITIALIZE_ROUTINE_TYPES = `
// BEGIN TRANSACTION;
// ${ROUTINE_TYPES.map(
//     (routineType) =>
//         `INSERT OR IGNORE INTO ${TABLE_ROUTINE_TYPES.name} (id, name) VALUES (${routineType.id}, '${routineType.name}');`,
// ).join('\n')}
// COMMIT;
// `;
// // Routines
// rowIndex = 0;
// const INITIALIZE_ROUTINES = `
// BEGIN TRANSACTION;
// INSERT OR IGNORE INTO ${
//     TABLE_ROUTINES.name
// } (id, name, code, type, isSystemCreated) VALUES (${rowIndex++}, 'Import Statements', '', ${
//     ROUTINE_TYPE_IMPORT.id
// }, true);
// COMMIT;
// `;
// // Conversations
// // Localizations
// rowIndex = 0;
// const DEFAULT_LOCALIZATION_ID = rowIndex;
// const INITIALIZE_LOCALIZATIONS = `
// INSERT OR IGNORE INTO ${
//     TABLE_LOCALIZATIONS.name
// } (id, parent, isSystemCreated, name, '${localeIdToColumn(
//     DEFAULT_LOCALE_ID,
// )}') VALUES (${rowIndex++}, NULL, true, 'Player Name', 'Player');`;
// // Locales
// rowIndex = DEFAULT_LOCALE_ID;
// const INITIALIZE_LOCALES = `
// INSERT OR IGNORE INTO ${
//     TABLE_LOCALES.name
// } (id, name, isSystemCreated) VALUES (${rowIndex++}, 'en_US', true);`;
// // Locale Principal
// rowIndex = 0;
// const INITIALIZE_LOCALE_PRINCIPAL = `
// INSERT OR IGNORE INTO ${
//     TABLE_LOCALE_PRINCIPAL.name
// } (id, principal) VALUES (${rowIndex++}, ${DEFAULT_LOCALE_ID});`;
// // Actors
// rowIndex = 0;
// const DEFAULT_ACTOR_ID = rowIndex;
// const INITIALIZE_ACTORS = `
// INSERT OR IGNORE INTO ${
//     TABLE_ACTORS.name
// } (id, name, color, localizedName, isSystemCreated) VALUES (${rowIndex++}, 'Player', '${ACTORS_DEFAULT_COLOR}', ${DEFAULT_LOCALIZATION_ID}, true);`;
// // Actor Principal
// rowIndex = 0;
// const INITIALIZE_ACTOR_PRINCIPAL = `
// INSERT OR IGNORE INTO ${
//     TABLE_ACTOR_PRINCIPAL.name
// } (id, principal) VALUES (${rowIndex++}, ${DEFAULT_ACTOR_ID});`;
// // Nodes
// export const INITIALIZE_TABLE_QUERIES = [
//     INITIALIZE_PROGRAMMING_LANGUAGES,
//     INITIALIZE_PROGRAMMING_LANGUAGE_PRINCIPAL,
//     INITIALIZE_ROUTINE_TYPES,
//     INITIALIZE_ROUTINES,
//     INITIALIZE_LOCALES,
//     INITIALIZE_LOCALE_PRINCIPAL,
//     INITIALIZE_LOCALIZATIONS,
//     INITIALIZE_ACTORS,
//     INITIALIZE_ACTOR_PRINCIPAL,
// ];
