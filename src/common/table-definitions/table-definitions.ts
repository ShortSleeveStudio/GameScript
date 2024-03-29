import type { FieldType, Table } from '../common-types';

export interface UniqueDefinition {
    columns: string[];
}

export interface ForeignKeyDefinition {
    column: string;
    table: Table;
    cascadeOnDelete: boolean;
}

export interface ColumnDefinition {
    name: string;
    type: FieldType;
    notNull: boolean;
    defaultValue: string | boolean | number | null | undefined;
}

export class TableDefinition {
    private _tableType: Table;
    private _columns: ColumnDefinition[];
    private _uniques: UniqueDefinition[];
    private _primaryKey: string;
    private _foreignKeys: ForeignKeyDefinition[];

    constructor(tableType: Table) {
        this._tableType = tableType;
        this._columns = [];
        this._uniques = [];
        this._primaryKey = '';
        this._foreignKeys = [];
    }

    get tableType(): Table {
        return this._tableType;
    }

    get columns(): ColumnDefinition[] {
        return this._columns;
    }

    get uniques(): UniqueDefinition[] {
        return this._uniques;
    }

    get primaryKey(): string {
        return this._primaryKey;
    }

    get foreignKeys(): ForeignKeyDefinition[] {
        return this._foreignKeys;
    }

    addColumn(definition: ColumnDefinition): void {
        this._columns.push(definition);
    }

    addUnique(unique: UniqueDefinition): void {
        this._uniques.push(unique);
    }

    addForeignKey(foreignKey: ForeignKeyDefinition): void {
        this._foreignKeys.push(foreignKey);
    }

    setPrimaryKey(primaryKey: string): void {
        this._primaryKey = primaryKey;
    }
}
