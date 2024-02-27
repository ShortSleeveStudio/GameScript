import type { Row } from '../../../../../common/common-schema';
import type {
    Filter,
    FilterBuilder,
    FilterColumnListType,
    FilterColumnType,
    OrderLimitOffsetBuild,
    OrderType,
    WhereAndOrCloseScopeEnd,
    WhereColumnOrOpenScope,
    WherePredicate,
} from './db-filter-interface';

interface Condition<RowType extends Row> {
    execute(row: RowType, missingColumnsAffected: boolean): boolean;
}

/**This is used to capture scopes for evaluation later (DFS) */
class Scope<RowType extends Row> implements Condition<RowType> {
    private _parent: Scope<RowType> | undefined;
    private _conditions: (Condition<RowType> | Scope<RowType>)[];
    private _andOrList: boolean[];

    constructor(parent: Scope<RowType> | undefined) {
        this._parent = parent;
        this._conditions = [];
        this._andOrList = []; // true is "and", false is "or"
    }

    get parent(): Scope<RowType> | undefined {
        return this._parent;
    }

    pushScope(): Scope<RowType> {
        const newScope = new Scope(this);
        this._conditions.push(newScope);
        return newScope;
    }

    popScope(): Scope<RowType> {
        if (this._parent === undefined) throw new Error('Tried to pop root scope');
        return this._parent;
    }

    addCondition(condition: (row: RowType, missingColumnsAffected: boolean) => boolean): void {
        this._conditions.push({ execute: condition });
    }

    and(): void {
        this._andOrList.push(true);
    }

    or(): void {
        this._andOrList.push(false);
    }

    execute(row: RowType, missingColumnsAffected: boolean): boolean {
        let result: boolean;
        if (this._conditions.length === 0) {
            return true;
        }
        if (this._conditions.length === 1) {
            return this._conditions[0].execute(row, missingColumnsAffected);
        }
        result = this._conditions[0].execute(row, missingColumnsAffected);
        for (let i = 1; i < this._conditions.length; i++) {
            const andOrIndex = Math.floor(i / 2);
            if (this._andOrList[andOrIndex]) {
                // AND
                result &&= this._conditions[i].execute(row, missingColumnsAffected);
            } else {
                // OR
                result ||= this._conditions[i].execute(row, missingColumnsAffected);
            }
        }
        return result;
    }
}

/**@internal */
export class FilterBuilderSqlite<RowType extends Row>
    implements
        FilterBuilder<RowType>,
        WhereColumnOrOpenScope<RowType>,
        WherePredicate<RowType>,
        WhereAndOrCloseScopeEnd<RowType>,
        OrderLimitOffsetBuild<RowType>,
        Filter<RowType>
{
    private _filter: string;
    private _whereClause: string;
    private _scopeDepth: number;
    private _currentWhere!: keyof RowType;
    private _scope: Scope<RowType>;
    private _limit: number | undefined;
    private _offset: number | undefined;
    private _order: Map<keyof RowType, OrderType>;

    constructor() {
        this._scopeDepth = 0;
        this._filter = '';
        this._limit = undefined;
        this._offset = undefined;
        this._scope = new Scope<RowType>(undefined);
        this._order = new Map();
    }

    eq(value: FilterColumnType): FilterBuilderSqlite<RowType> {
        const currentWhere = this._currentWhere;
        this._scope.addCondition((row: RowType, missingColumnsAffected: boolean): boolean => {
            if (!(currentWhere in row)) return missingColumnsAffected;
            return this.castUnacceptableType(row[currentWhere]) === value;
        });

        const formattedValue: string = this.formatValue(value);
        this._filter += ` = ${formattedValue}`;
        return this;
    }
    ne(value: FilterColumnType): FilterBuilderSqlite<RowType> {
        const currentWhere = this._currentWhere;
        this._scope.addCondition((row: RowType, missingColumnsAffected: boolean): boolean => {
            if (!(currentWhere in row)) return missingColumnsAffected;
            return this.castUnacceptableType(row[currentWhere]) !== value;
        });

        const formattedValue: string = this.formatValue(value);
        this._filter += ` != ${formattedValue}`;
        return this;
    }
    like(value: string): FilterBuilderSqlite<RowType> {
        const currentWhere = this._currentWhere;
        this._scope.addCondition((row: RowType, missingColumnsAffected: boolean): boolean => {
            if (!(currentWhere in row)) return missingColumnsAffected;
            const regexString = value.replaceAll('%', '.*?').replaceAll('_', '.{1}');
            const regExp: RegExp = new RegExp(regexString);
            return regExp.test(String(row[currentWhere]));
        });

        this._filter += ` LIKE ${this.formatValue(value)}`;
        return this;
    }
    notLike(value: string): FilterBuilderSqlite<RowType> {
        const currentWhere = this._currentWhere;
        this._scope.addCondition((row: RowType, missingColumnsAffected: boolean): boolean => {
            if (!(currentWhere in row)) return missingColumnsAffected;
            const regexString = value.replaceAll('%', '.*?').replaceAll('_', '.{1}');
            const regExp: RegExp = new RegExp(regexString);
            return !regExp.test(String(row[currentWhere]));
        });

        this._filter += ` NOT LIKE ${this.formatValue(value)}`;
        return this;
    }
    lt(value: FilterColumnType): FilterBuilderSqlite<RowType> {
        const currentWhere = this._currentWhere;
        this._scope.addCondition((row: RowType, missingColumnsAffected: boolean): boolean => {
            if (!(currentWhere in row)) return missingColumnsAffected;
            return row[currentWhere] < value;
        });

        const formattedValue: string = this.formatValue(value);
        this._filter += ` < ${formattedValue}`;
        return this;
    }
    lte(value: FilterColumnType): FilterBuilderSqlite<RowType> {
        const currentWhere = this._currentWhere;
        this._scope.addCondition((row: RowType, missingColumnsAffected: boolean): boolean => {
            if (!(currentWhere in row)) return missingColumnsAffected;
            return row[currentWhere] <= value;
        });

        const formattedValue: string = this.formatValue(value);
        this._filter += ` <= ${formattedValue}`;
        return this;
    }
    gt(value: FilterColumnType): FilterBuilderSqlite<RowType> {
        const currentWhere = this._currentWhere;
        this._scope.addCondition((row: RowType, missingColumnsAffected: boolean): boolean => {
            if (!(currentWhere in row)) return missingColumnsAffected;
            return row[currentWhere] > value;
        });

        const formattedValue: string = this.formatValue(value);
        this._filter += ` > ${formattedValue}`;
        return this;
    }
    gte(value: FilterColumnType): FilterBuilderSqlite<RowType> {
        const currentWhere = this._currentWhere;
        this._scope.addCondition((row: RowType, missingColumnsAffected: boolean): boolean => {
            if (!(currentWhere in row)) return missingColumnsAffected;
            return row[currentWhere] >= value;
        });

        const formattedValue: string = this.formatValue(value);
        this._filter += ` >= ${formattedValue}`;
        return this;
    }
    in(value: FilterColumnListType): FilterBuilderSqlite<RowType> {
        const currentWhere = this._currentWhere;
        this._scope.addCondition((row: RowType, missingColumnsAffected: boolean): boolean => {
            if (!(currentWhere in row)) return missingColumnsAffected;
            return value.indexOf(<FilterColumnType>row[currentWhere]) !== -1;
        });

        let result: string = '';
        for (let i = 0; i < value.length; i++) {
            if (i > 0) result += ', ';
            result += this.formatValue(value[i]);
        }
        this._filter += ` IN (${result})`;
        return this;
    }
    notIn(value: FilterColumnListType): FilterBuilderSqlite<RowType> {
        const currentWhere = this._currentWhere;
        this._scope.addCondition((row: RowType, missingColumnsAffected: boolean): boolean => {
            if (!(currentWhere in row)) return missingColumnsAffected;
            return value.indexOf(<FilterColumnType>row[currentWhere]) === -1;
        });

        let result: string = '';
        for (let i = 0; i < value.length; i++) {
            if (i > 0) result += ', ';
            result += this.formatValue(value[i]);
        }
        this._filter += ` NOT IN (${result})`;
        return this;
    }
    where(): FilterBuilderSqlite<RowType> {
        this._filter += ' WHERE';
        return this;
    }
    endWhere(): FilterBuilderSqlite<RowType> {
        return this;
    }
    column(fieldName: keyof RowType): FilterBuilderSqlite<RowType> {
        this._currentWhere = fieldName;
        this._filter += ` ${String(fieldName)}`;
        return this;
    }
    and(): FilterBuilderSqlite<RowType> {
        this._scope.and();
        this._filter += ` AND`;
        return this;
    }
    or(): FilterBuilderSqlite<RowType> {
        this._scope.or();
        this._filter += ` OR`;
        return this;
    }
    openScope(): FilterBuilderSqlite<RowType> {
        this._scopeDepth++;
        this._scope = this._scope.pushScope();

        this._filter += ` (`;
        return this;
    }
    closeScope(): FilterBuilderSqlite<RowType> {
        this._scopeDepth--;
        this._scope = this._scope.popScope();

        this._filter += ` )`;
        return this;
    }

    limit(limit: number): FilterBuilderSqlite<RowType> {
        this._limit = limit;
        return this;
    }
    offset(offset: number): FilterBuilderSqlite<RowType> {
        this._offset = offset;
        return this;
    }
    orderBy(fieldName: keyof RowType, order: OrderType): FilterBuilderSqlite<RowType> {
        this._order.set(fieldName, order);
        return this;
    }

    build(): FilterBuilderSqlite<RowType> {
        if (this._scopeDepth > 0) {
            throw new Error(`Open scope never closed. Depth: ${this._scopeDepth}`);
        }
        this._whereClause = this._filter.slice().trim();
        if (this._order.size > 0) {
            this._filter += ` ORDER BY`;
            let isFirst: boolean = true;
            for (const [key, value] of this._order.entries()) {
                if (isFirst) isFirst = false;
                else this._filter += ',';
                this._filter += ` ${<string>key} ${value}`;
            }
        }
        if (this._limit !== undefined) this._filter += ` LIMIT ${this._limit}`;
        if (this._offset !== undefined) this._filter += ` OFFSET ${this._offset}`;
        this._filter = this._filter.trim();
        return this;
    }

    whereClause(): string {
        return this._whereClause;
    }

    wouldAffectRow(row: RowType, missingColumnsAffected): boolean {
        return this._scope.execute(row, missingColumnsAffected);
    }
    wouldAffectRows(rows: RowType[], missingColumnsAffected): boolean {
        if (!rows) throw Error('Passed in a null or empty array to filter');
        for (let i = 0; i < rows.length; i++) {
            if (this._scope.execute(rows[i], missingColumnsAffected)) {
                return true;
            }
        }
        return false;
    }
    toString(): string {
        return this._filter;
    }
    equals(other: Filter<RowType>): boolean {
        return other.toString() === this._filter;
    }
    getOffset(): number {
        return this._offset;
    }
    getLimit(): number {
        return this._limit;
    }

    private formatValue(value: FilterColumnType): string {
        const type: string = typeof value;
        if (type === 'string') {
            return `'${value}'`;
        } else if (type === 'boolean') {
            return `${value ? 'true' : 'false'}`;
        } else {
            return `${value}`;
        }
    }

    private castUnacceptableType(value: unknown): unknown {
        const type: string = typeof value;
        if (type === 'boolean') {
            value = value ? 1 : 0;
        }
        return value;
    }
}
