import type {
    Filter,
    FilterBuilder,
    FilterColumnListType,
    FilterColumnType,
    FilterCompleteOrContinue,
    WhereClauseOperatorSelector,
} from './db-filter-interface';
import type { Row } from './db-schema';

interface Condition<RowType extends Row> {
    execute(row: RowType): boolean;
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

    addCondition(condition: (row: RowType) => boolean): void {
        this._conditions.push({ execute: condition });
    }

    and(): void {
        this._andOrList.push(true);
    }

    or(): void {
        this._andOrList.push(false);
    }

    execute(row: RowType): boolean {
        let result: boolean;
        if (this._conditions.length === 0) {
            return true;
        }
        if (this._conditions.length === 1) {
            return this._conditions[0].execute(row);
        }
        result = this._conditions[0].execute(row);
        for (let i = 1; i < this._conditions.length; i++) {
            const andOrIndex = Math.floor(i / 2);
            if (this._andOrList[andOrIndex]) {
                // AND
                result &&= this._conditions[i].execute(row);
            } else {
                // OR
                result ||= this._conditions[i].execute(row);
            }
        }
        return result;
    }
}

/**@internal */
export class FilterBuilderSqlite<RowType extends Row>
    implements
        FilterBuilder<RowType>,
        WhereClauseOperatorSelector<RowType>,
        FilterCompleteOrContinue<RowType>,
        Filter<RowType>
{
    private _filter: string;
    private _scopeDepth: number;
    private _currentWhere!: keyof RowType;
    private _scope: Scope<RowType>;

    constructor() {
        this._scopeDepth = 0;
        this._filter = '';
        this._scope = new Scope<RowType>(undefined);
    }

    is(value: FilterColumnType): FilterCompleteOrContinue<RowType> {
        const currentWhere = this._currentWhere;
        this._scope.addCondition((row: RowType): boolean => {
            return row[currentWhere] === value;
        });

        const formattedValue: string = this.formatValue(value);
        this._filter += ` IS ${formattedValue}`;
        return this;
    }
    isNot(value: FilterColumnType): FilterCompleteOrContinue<RowType> {
        const currentWhere = this._currentWhere;
        this._scope.addCondition((row: RowType): boolean => {
            return row[currentWhere] !== value;
        });

        const formattedValue: string = this.formatValue(value);
        this._filter += ` IS NOT ${formattedValue}`;
        return this;
    }
    like(value: string): FilterCompleteOrContinue<RowType> {
        const currentWhere = this._currentWhere;
        this._scope.addCondition((row: RowType): boolean => {
            const regexString = value.replaceAll('%', '.*?').replaceAll('_', '.{1}');
            const regExp: RegExp = new RegExp(regexString);
            return regExp.test(String(row[currentWhere]));
        });

        this._filter += ` LIKE ${this.formatValue(value)}`;
        return this;
    }
    notLike(value: string): FilterCompleteOrContinue<RowType> {
        const currentWhere = this._currentWhere;
        this._scope.addCondition((row: RowType): boolean => {
            const regexString = value.replaceAll('%', '.*?').replaceAll('_', '.{1}');
            const regExp: RegExp = new RegExp(regexString);
            return !regExp.test(String(row[currentWhere]));
        });

        this._filter += ` NOT LIKE ${this.formatValue(value)}`;
        return this;
    }
    lt(value: FilterColumnType): FilterCompleteOrContinue<RowType> {
        const currentWhere = this._currentWhere;
        this._scope.addCondition((row: RowType): boolean => {
            return row[currentWhere] < value;
        });

        const formattedValue: string = this.formatValue(value);
        this._filter += ` < ${formattedValue}`;
        return this;
    }
    lte(value: FilterColumnType): FilterCompleteOrContinue<RowType> {
        const currentWhere = this._currentWhere;
        this._scope.addCondition((row: RowType): boolean => {
            return row[currentWhere] <= value;
        });

        const formattedValue: string = this.formatValue(value);
        this._filter += ` <= ${formattedValue}`;
        return this;
    }
    gt(value: FilterColumnType): FilterCompleteOrContinue<RowType> {
        const currentWhere = this._currentWhere;
        this._scope.addCondition((row: RowType): boolean => {
            return row[currentWhere] > value;
        });

        const formattedValue: string = this.formatValue(value);
        this._filter += ` > ${formattedValue}`;
        return this;
    }
    gte(value: FilterColumnType): FilterCompleteOrContinue<RowType> {
        const currentWhere = this._currentWhere;
        this._scope.addCondition((row: RowType): boolean => {
            return row[currentWhere] >= value;
        });

        const formattedValue: string = this.formatValue(value);
        this._filter += ` >= ${formattedValue}`;
        return this;
    }
    in(value: FilterColumnListType): FilterCompleteOrContinue<RowType> {
        const currentWhere = this._currentWhere;
        this._scope.addCondition((row: RowType): boolean => {
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
    notIn(value: FilterColumnListType): FilterCompleteOrContinue<RowType> {
        const currentWhere = this._currentWhere;
        this._scope.addCondition((row: RowType): boolean => {
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
    where(fieldName: keyof RowType): WhereClauseOperatorSelector<RowType> {
        this._currentWhere = fieldName;
        this._filter += ` ${String(fieldName)}`;
        return this;
    }
    and(): FilterBuilder<RowType> {
        this._scope.and();
        this._filter += ` AND`;
        return this;
    }
    or(): FilterBuilder<RowType> {
        this._scope.or();
        this._filter += ` OR`;
        return this;
    }
    openScope(): FilterBuilder<RowType> {
        this._scopeDepth++;
        this._scope = this._scope.pushScope();

        this._filter += ` (`;
        return this;
    }
    closeScope(): FilterCompleteOrContinue<RowType> {
        this._scopeDepth--;
        this._scope = this._scope.popScope();

        this._filter += ` )`;
        return this;
    }
    build(): Filter<RowType> {
        if (this._scopeDepth > 0)
            throw new Error(`Open scope never closed. Depth: ${this._scopeDepth}`);
        this._filter = this._filter.trim();
        return this;
    }

    wouldAffectRow(row: RowType): boolean {
        return this._scope.execute(row);
    }
    wouldAffectRows(rows: RowType[]): boolean {
        if (!rows) throw Error('Passed in a null or empty array to filter');
        for (let i = 0; i < rows.length; i++) {
            if (this._scope.execute(rows[i])) {
                return true;
            }
        }
        return false;
    }
    toString(): string {
        return this._filter;
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
}
