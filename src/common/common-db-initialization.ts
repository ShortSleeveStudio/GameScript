import type {
    Actor,
    ActorPrincipal,
    Locale,
    LocalePrincipal,
    ProgrammingLanguagePrincipal,
    Routine,
    Row,
    Table,
    Version,
} from './common-schema';
import {
    DATABASE_TABLES,
    PROGRAMMING_LANGUAGE_CS,
    PROGRAMMING_LANGUAGE_TYPES,
    PROPERTY_TYPES,
    ROUTINE_TYPES,
    ROUTINE_TYPE_IMPORT,
    TABLE_ACTORS,
    TABLE_ACTOR_PRINCIPAL,
    TABLE_LOCALES,
    TABLE_LOCALE_PRINCIPAL,
    TABLE_PROGRAMMING_LANGUAGES,
    TABLE_PROGRAMMING_LANGUAGE_PRINCIPAL,
    TABLE_PROPERTY_TYPES,
    TABLE_ROUTINES,
    TABLE_ROUTINE_TYPES,
    TABLE_TABLES,
    TABLE_VERSION,
} from './common-types';
import { ACTORS_DEFAULT_COLOR } from './constants';

export interface InitialTableRows {
    table: Table;
    rows: Row[];
}

export const DB_DEFAULT_ACTOR_ID: number = 0;
export const DB_DEFAULT_ACTOR_PRINCIPAL_ID: number = 0;
export const DB_DEFAULT_LOCALE_ID: number = 0;
export const DB_DEFAULT_LOCALE_PRINCIPAL_ID: number = 0;
export const DB_DEFAULT_ROUTINE_ID: number = 0;
export const DB_DEFAULT_ROUTINE_PRINCIPAL_ID: number = 0;
export const DB_DEFAULT_VERSION_ID: number = 0;

export const DB_INITIAL_ROWS: InitialTableRows[] = [
    { table: TABLE_TABLES, rows: DATABASE_TABLES },
    { table: TABLE_PROGRAMMING_LANGUAGES, rows: PROGRAMMING_LANGUAGE_TYPES },
    {
        table: TABLE_PROGRAMMING_LANGUAGE_PRINCIPAL,
        rows: [
            <ProgrammingLanguagePrincipal>{
                id: DB_DEFAULT_ROUTINE_PRINCIPAL_ID,
                principal: PROGRAMMING_LANGUAGE_CS.id,
            },
        ],
    },
    { table: TABLE_ROUTINE_TYPES, rows: ROUTINE_TYPES },
    {
        table: TABLE_ROUTINES,
        rows: [
            <Routine>{
                id: DB_DEFAULT_ROUTINE_ID,
                name: 'Import Statements',
                code: '',
                type: ROUTINE_TYPE_IMPORT.id,
                is_system_created: true,
                is_condition: false,
            },
        ],
    },
    {
        table: TABLE_LOCALES,
        rows: [
            <Locale>{
                id: DB_DEFAULT_LOCALE_ID,
                name: 'en_US',
                is_system_created: true,
            },
        ],
    },
    {
        table: TABLE_LOCALE_PRINCIPAL,
        rows: [
            <LocalePrincipal>{
                id: DB_DEFAULT_LOCALE_PRINCIPAL_ID,
                principal: DB_DEFAULT_LOCALE_ID,
            },
        ],
    },
    {
        table: TABLE_ACTORS,
        rows: [
            <Actor>{
                id: DB_DEFAULT_ACTOR_ID,
                name: 'Player',
                color: ACTORS_DEFAULT_COLOR,
                is_system_created: true,
            },
        ],
    },
    {
        table: TABLE_ACTOR_PRINCIPAL,
        rows: [
            <ActorPrincipal>{
                id: DB_DEFAULT_ACTOR_PRINCIPAL_ID,
                principal: DB_DEFAULT_ACTOR_ID,
            },
        ],
    },
    {
        table: TABLE_VERSION,
        rows: [
            <Version>{
                id: DB_DEFAULT_VERSION_ID,
                version: '0.0.0',
            },
        ],
    },
    {
        table: TABLE_PROPERTY_TYPES,
        rows: PROPERTY_TYPES,
    },
];
