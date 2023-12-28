import { NotificationItem, NotificationManager } from '@lib/stores/app/notifications';
import type { FileDetails } from '@lib/utility/file-details';
import { wait } from '@lib/utility/test';
import Database, { type QueryResult } from '@tauri-apps/plugin-sql';
import { type Unsubscriber, type Writable } from 'svelte/store';
import { Db } from './db-base';
import {
    FIELD_TYPES,
    NODE_TYPES,
    PROGRAMMING_LANGUAGE_NAMES,
    TABLE_NAME_DEFAULT_FIELDS,
    TABLE_NAME_FIELD_TYPES,
    TABLE_NAME_NODE_TYPES,
    TABLE_NAME_PROGRAMMING_LANGUAGES,
    TABLE_NAME_SELECTED_PROGRAMMING_LANGUAGE,
    type DatabaseTableName,
    type Row,
} from './db-types';
import { DbRowView } from './db-view-row';
import type { IDbRowView } from './db-view-row-interface';
import { DbTableView } from './db-view-table';
import type { IDbTableView } from './db-view-table-interface';

/**
 * SQLite database implementation
 * NOTE:
 * The default database file location is:
 * C:\Users\<username>\AppData\Roaming\com.tauri.dev\GameScript.db
 */
export class SqliteDb extends Db {
    private _tableToRowView: Map<string, Map<number, IDbRowView<Row>>>;
    private _tableToTableView: Map<string, IDbTableView<Row>[]>;
    private _unsubscribeSqlitePath: Unsubscriber;
    private _unsubscribeDbConnected: Unsubscriber;
    private _sqlitePathStore: Writable<FileDetails>;
    private _dbSqlitePathError: Writable<string>;
    private _notificationManager: NotificationManager;

    constructor(
        isConnected: Writable<boolean>,
        sqlitePathStore: Writable<FileDetails>,
        dbSqlitePathError: Writable<string>,
        notificationManager: NotificationManager,
    ) {
        super(isConnected);
        this._tableToRowView = new Map();
        this._tableToTableView = new Map();
        this._sqlitePathStore = sqlitePathStore;
        this._dbSqlitePathError = dbSqlitePathError;
        this._notificationManager = notificationManager;
        this._unsubscribeDbConnected = this._isConnected.subscribe(this.onDbConnectedChanged);
        this._unsubscribeSqlitePath = this._sqlitePathStore.subscribe(this.onDbPathChanged);
    }

    fetchTable<RowType extends Row>(tableName: DatabaseTableName): IDbTableView<RowType> {
        // Create view
        const tableView = new DbTableView<RowType>(<Db>this, tableName);

        // Store it in the map
        this.getTableViewsForTable(tableName).push(tableView);

        // Return
        return tableView;
    }

    async createRow<RowType extends Row>(
        tableName: DatabaseTableName,
        row: RowType,
    ): Promise<RowType> {
        this.assertConnected();
        return (await this.createRows(tableName, [row]))[0];
    }

    async createRows<RowType extends Row>(
        tableName: DatabaseTableName,
        rows: RowType[],
    ): Promise<RowType[]> {
        this.assertConnected();
        for (let i = 0; i < rows.length; i++) {
            // Grab row
            const row: RowType = rows[i];

            // Generate query arguments
            let propertyNames: string = '';
            let placeHolders: string = '';
            const argumentArray: unknown[] = [];
            let index: number = 0;
            for (const prop in row) {
                if (argumentArray.length >= 1) {
                    propertyNames += ', ';
                    placeHolders += ', ';
                }
                propertyNames += prop;
                placeHolders += '$' + ++index; // starts at 1
                const value: unknown = row[prop];
                argumentArray.push(typeof value === 'boolean' ? (value ? 1 : 0) : value);
            }

            // Execute
            const result: QueryResult = await this._db.execute(
                `INSERT INTO ${tableName} (${propertyNames}) VALUES (${placeHolders});`,
                argumentArray,
            );
            this.assertQueryResult(result, 'Failed to create row');

            // Set row id
            row.id = result.lastInsertId;
        }

        // TODO: REMOVE THIS
        await wait(300);

        // Notify
        this.notifyTableViews(tableName);

        // Return new id
        return rows;
    }

    // TODO: add filters and aliases
    async fetchRows<RowType extends Row>(
        tableName: DatabaseTableName,
    ): Promise<IDbRowView<RowType>[]> {
        if (!this.isConnected()) return <IDbRowView<RowType>[]>[];

        // Fetch rows
        const results = await this._db.select<RowType[]>(
            `SELECT * FROM ${tableName} ORDER BY id ASC`,
        );

        // Fetch row views
        const rowViews: Map<number, IDbRowView<RowType>> = this.getRowViewsForTable(tableName);

        // Map to row views
        const newRowViews: IDbRowView<RowType>[] = results.map<IDbRowView<RowType>>(
            (result: RowType) => {
                // Fetched cached row view, or create a new one if it doesn't exist
                return this.getOrCreateRowView(rowViews, tableName, result);
            },
        );

        // TODO: remove
        await wait(300);

        return newRowViews;
    }

    async updateRow<RowType extends Row>(
        tableName: DatabaseTableName,
        row: RowType,
    ): Promise<void> {
        this.assertConnected();
        // Generate query arguments
        let keyValuePairs: string = '';
        const argumentArray: unknown[] = [];
        let i: number = 0;
        for (const prop in row) {
            // We never set id for updates
            if (prop === 'id') continue;
            if (argumentArray.length >= 1) keyValuePairs += ', ';
            keyValuePairs += `${prop} = $${++i}`; // start at 1
            const value: unknown = row[prop];
            argumentArray.push(typeof value === 'boolean' ? (value ? 1 : 0) : value);
        }
        argumentArray.push(row.id);

        // Execute
        const query = `UPDATE ${tableName} SET ${keyValuePairs} WHERE id = $${++i};`;
        const result: QueryResult = await this._db.execute(query, argumentArray);
        this.assertQueryResult(result, 'Failed to update row');

        // Notify
        const rowView = this.getOrCreateRowView(
            this.getRowViewsForTable(tableName),
            tableName,
            row,
        );
        // TODO: REMOVE THIS
        await wait(300);
        rowView.onRowUpdated(row);
    }

    async deleteRow<RowType extends Row>(
        tableName: DatabaseTableName,
        row: RowType,
    ): Promise<void> {
        this.assertConnected();
        await this.deleteRows(tableName, [row]);
    }

    async deleteRows<RowType extends Row>(
        tableName: DatabaseTableName,
        rows: RowType[],
    ): Promise<void> {
        this.assertConnected();
        // Delete
        const result: QueryResult = await this._db.execute(
            `DELETE FROM ${tableName} WHERE id IN (${rows.map((row) => row.id).join(', ')})`,
        );
        this.assertQueryResult(result, 'Failed to delete row');

        // TODO: REMOVE THIS
        await wait(300);

        // Notify
        this.notifyTableViews(tableName);

        // Remove from cache
        this.removeRowViews(tableName, rows);
    }

    async shutdown(): Promise<void> {
        await super.shutdown();
        this._unsubscribeSqlitePath();
        this._unsubscribeDbConnected();
    }

    private onDbConnectedChanged = (isConnected: boolean) => {
        // Notify user
        if (isConnected) {
            this._notificationManager.showNotification(
                new NotificationItem('success', '', 'Connected to database'),
            );
        } else {
            this._notificationManager.showNotification(
                new NotificationItem('warning', '', 'Disconnected from database'),
            );
        }

        // Notify tables
        this._tableToTableView.forEach((tableViewList: IDbTableView<Row>[]) => {
            for (let i = 0; i < tableViewList.length; i++) {
                tableViewList[0].onTableChange();
            }
        });
    };

    private onDbPathChanged = async (fileDetails: FileDetails) => {
        // Destroy previous connection
        super.destroyConnection();

        // Only attempt to connect if we have a valid path
        if (!fileDetails || !fileDetails.path) {
            return;
        }

        try {
            // Attempt to connect
            this._db = await Database.load(`sqlite:${fileDetails.path}`);

            // Ensure schema
            await this.initializeSchema();

            // Notify connected
            this._isConnected.set(true);
        } catch (e: unknown) {
            this._dbSqlitePathError.set(this.extractError(e));
        }
    };

    private notifyTableViews<RowType extends Row>(tableName: string) {
        const tableViewList: IDbTableView<RowType>[] =
            this.getTableViewsForTable<RowType>(tableName);
        for (let i = 0; i < tableViewList.length; i++) {
            tableViewList[i].onTableChange();
        }
    }

    private getTableViewsForTable<RowType extends Row>(tableName: string): IDbTableView<RowType>[] {
        let tableViewList: IDbTableView<RowType>[] = <IDbTableView<RowType>[]>(
            this._tableToTableView.get(tableName)
        );
        if (!tableViewList) {
            tableViewList = [];
            this._tableToTableView.set(tableName, tableViewList);
        }
        return tableViewList;
    }

    private getRowViewsForTable<RowType extends Row>(
        tableName: DatabaseTableName,
    ): Map<number, IDbRowView<RowType>> {
        let rowViewMap: Map<number, IDbRowView<RowType>> = <Map<number, IDbRowView<RowType>>>(
            this._tableToRowView.get(tableName)
        );
        if (!rowViewMap) {
            rowViewMap = new Map();
            this._tableToRowView.set(tableName, rowViewMap);
        }
        return rowViewMap;
    }

    private getOrCreateRowView<RowType extends Row>(
        rowViews: Map<number, IDbRowView<RowType>>,
        tableName: DatabaseTableName,
        row: RowType,
    ) {
        let rowView = rowViews.get(row.id);
        if (!rowView) {
            rowView = new DbRowView<RowType>(<Db>this, tableName, row);
            rowViews.set(row.id, rowView);
        }
        return rowView;
    }

    private removeRowViews<RowType extends Row>(tableName: DatabaseTableName, row: RowType[]) {
        const rowViews: Map<number, IDbRowView<RowType>> = this.getRowViewsForTable(tableName);
        row.forEach((row) => rowViews.delete(row.id));
    }

    private async initializeSchema(): Promise<void> {
        // Ensure tables exist
        for (let i = 0; i < CREATE_TABLE_QUERIES.length; i++) {
            const query = CREATE_TABLE_QUERIES[i];
            const result: QueryResult | undefined = await this._db.execute(query);
            if (!result) throw new Error('Failed to create table');
        }

        // Ensure static tables are populated
        for (let i = 0; i < INITIALIZE_TABLE_QUERIES.length; i++) {
            const query = INITIALIZE_TABLE_QUERIES[i];
            const result: QueryResult | undefined = await this._db?.execute(query);
            if (!result) throw new Error('Failed to initialize tables');
        }
    }

    private extractError(e: unknown): string {
        let message: string;
        switch (typeof e) {
            case 'string':
                message = <string>e;
                break;
            case 'object':
                if ('message' in <object>e) {
                    message = (<Error>e).message;
                    break;
                }
            // @t s-expect-error fallthrough
            default:
                message = 'Invalid database file';
                break;
        }
        return message;
    }
}

///
/// Table Creation
///
/**Create default fields table */
const CREATE_TABLE_FIELD_TYPES = `
CREATE TABLE IF NOT EXISTS "${TABLE_NAME_FIELD_TYPES}" (
	"id"	INTEGER,
	"name"	TEXT NOT NULL UNIQUE,
	PRIMARY KEY("id" AUTOINCREMENT)
);`;
const CREATE_TABLE_NODE_TYPES = `
CREATE TABLE IF NOT EXISTS "${TABLE_NAME_NODE_TYPES}" (
	"id"	INTEGER,
	"name"	TEXT NOT NULL UNIQUE,
	PRIMARY KEY("id" AUTOINCREMENT)
);`;
const CREATE_TABLE_DEFAULT_FIELDS = `
CREATE TABLE IF NOT EXISTS "${TABLE_NAME_DEFAULT_FIELDS}" (
	"id"	INTEGER,
	"name"	TEXT NOT NULL,
	"fieldType"	INTEGER NOT NULL,
	"nodeType"	INTEGER NOT NULL,
	"required"	INTEGER NOT NULL,
	FOREIGN KEY("fieldType") REFERENCES "field_types"("id"),
	FOREIGN KEY("nodeType") REFERENCES "node_types"("id"),
	PRIMARY KEY("id" AUTOINCREMENT)
);`;
const CREATE_TABLE_PROGRAMMING_LANGUAGES = `
CREATE TABLE IF NOT EXISTS "${TABLE_NAME_PROGRAMMING_LANGUAGES}" (
	"id"	INTEGER,
	"name"	TEXT NOT NULL UNIQUE,
	PRIMARY KEY("id" AUTOINCREMENT)
);`;
const CREATE_TABLE_SELECTED_PROGRAMMING_LANGUAGE = `
CREATE TABLE IF NOT EXISTS "${TABLE_NAME_SELECTED_PROGRAMMING_LANGUAGE}" (
	"id"	INTEGER CHECK(id = 0),
	"languageId"	INTEGER NOT NULL DEFAULT 0,
	FOREIGN KEY("languageId") REFERENCES "programming_languages",
	PRIMARY KEY("id" AUTOINCREMENT)
);
`;
const CREATE_TABLE_QUERIES = [
    CREATE_TABLE_FIELD_TYPES,
    CREATE_TABLE_NODE_TYPES,
    CREATE_TABLE_DEFAULT_FIELDS,
    CREATE_TABLE_PROGRAMMING_LANGUAGES,
    CREATE_TABLE_SELECTED_PROGRAMMING_LANGUAGE,
];

///
/// Table Initialization
///
const INITIALIZE_FIELD_TYPES = `
BEGIN TRANSACTION;
${FIELD_TYPES.map(
    (fieldType) =>
        `INSERT OR IGNORE INTO ${TABLE_NAME_FIELD_TYPES} (id, name) VALUES (${fieldType.id}, '${fieldType.name}');`,
).join('\n')}
COMMIT;
`;
const INITIALIZE_NODE_TYPES = `
BEGIN TRANSACTION;
${NODE_TYPES.map(
    (nodeType) =>
        `INSERT OR IGNORE INTO ${TABLE_NAME_NODE_TYPES} (id, name) VALUES(${nodeType.id}, '${nodeType.name}');`,
).join('\n')}
COMMIT;
`;
const INITIALIZE_DEFAULT_FIELDS = `
BEGIN TRANSACTION;
INSERT OR IGNORE INTO ${TABLE_NAME_DEFAULT_FIELDS} (id, name, fieldType, nodeType, required) VALUES (0, 'Actor', 0, 1, true);
INSERT OR IGNORE INTO ${TABLE_NAME_DEFAULT_FIELDS} (id, name, fieldType, nodeType, required) VALUES (1, 'UI Text', 4, 1, true);
INSERT OR IGNORE INTO ${TABLE_NAME_DEFAULT_FIELDS} (id, name, fieldType, nodeType, required) VALUES (2, 'Script Text', 4, 1, true);
INSERT OR IGNORE INTO ${TABLE_NAME_DEFAULT_FIELDS} (id, name, fieldType, nodeType, required) VALUES (3, 'Condition', 2, 1, true);
INSERT OR IGNORE INTO ${TABLE_NAME_DEFAULT_FIELDS} (id, name, fieldType, nodeType, required) VALUES (4, 'Code', 2, 1, true);
INSERT OR IGNORE INTO ${TABLE_NAME_DEFAULT_FIELDS} (id, name, fieldType, nodeType, required) VALUES (5, 'Name', 4, 0, true);
INSERT OR IGNORE INTO ${TABLE_NAME_DEFAULT_FIELDS} (id, name, fieldType, nodeType, required) VALUES (6, 'Color', 3, 0, true);
COMMIT;
`;
const INITIALIZE_PROGRAMMING_LANGUAGES = `
BEGIN TRANSACTION;
${PROGRAMMING_LANGUAGE_NAMES.map((languageName: string, index: number) => {
    return `INSERT OR IGNORE INTO ${TABLE_NAME_PROGRAMMING_LANGUAGES} (id, name) VALUES (${index}, '${languageName}');`;
}).join('\n')}
COMMIT;
`;

const INITIALIZE_SELECTED_PROGRAMMING_LANGUAGE = `
INSERT OR IGNORE INTO ${TABLE_NAME_SELECTED_PROGRAMMING_LANGUAGE} (id, languageId) VALUES (0, 0);
`;
const INITIALIZE_TABLE_QUERIES = [
    INITIALIZE_NODE_TYPES,
    INITIALIZE_FIELD_TYPES,
    INITIALIZE_DEFAULT_FIELDS,
    INITIALIZE_PROGRAMMING_LANGUAGES,
    INITIALIZE_SELECTED_PROGRAMMING_LANGUAGE,
];
