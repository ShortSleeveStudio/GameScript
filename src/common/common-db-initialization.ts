import type {
    Actor,
    ActorPrincipal,
    Locale,
    LocalePrincipal,
    ProgrammingLanguagePrincipal,
    Routine,
    Row,
} from './common-schema';
import {
    PROGRAMMING_LANGUAGE_CS,
    PROGRAMMING_LANGUAGE_TYPES,
    ROUTINE_TYPES,
    ROUTINE_TYPE_IMPORT,
    TABLE_ACTORS,
    TABLE_ACTOR_PRINCIPAL,
    TABLE_LOCALES,
    TABLE_LOCALE_PRINCIPAL,
    TABLE_PROGRAMMING_LANGUAGES,
    TABLE_PROGRAMMING_LANGUAGE_PRINCIPAL,
    TABLE_ROUTINES,
    TABLE_ROUTINE_TYPES,
    type DatabaseTableType,
} from './common-types';
import { ACTORS_DEFAULT_COLOR } from './constants';

export interface InitialTableRows {
    table: DatabaseTableType;
    rows: Row[];
}

export const DB_DEFAULT_LOCALE_ID: number = 1;

export const DB_INITIAL_ROWS: InitialTableRows[] = [
    { table: TABLE_PROGRAMMING_LANGUAGES, rows: PROGRAMMING_LANGUAGE_TYPES },
    {
        table: TABLE_PROGRAMMING_LANGUAGE_PRINCIPAL,
        rows: [
            <ProgrammingLanguagePrincipal>{
                id: 1,
                principal: PROGRAMMING_LANGUAGE_CS.id,
            },
        ],
    },
    { table: TABLE_ROUTINE_TYPES, rows: ROUTINE_TYPES },
    {
        table: TABLE_ROUTINES,
        rows: [
            <Routine>{
                id: 1,
                name: 'Import Statements',
                code: '',
                type: ROUTINE_TYPE_IMPORT.id,
                isSystemCreated: true,
            },
        ],
    },
    {
        table: TABLE_LOCALES,
        rows: [
            <Locale>{
                id: DB_DEFAULT_LOCALE_ID,
                name: 'en_US',
                isSystemCreated: true,
            },
        ],
    },
    {
        table: TABLE_LOCALE_PRINCIPAL,
        rows: [
            <LocalePrincipal>{
                id: 1,
                principal: 0,
            },
        ],
    },
    {
        table: TABLE_ACTORS,
        rows: [
            <Actor>{
                id: 1,
                name: 'Player',
                color: ACTORS_DEFAULT_COLOR,
                isSystemCreated: true,
            },
        ],
    },
    {
        table: TABLE_ACTOR_PRINCIPAL,
        rows: [
            <ActorPrincipal>{
                id: 1,
                principal: 0,
            },
        ],
    },
];