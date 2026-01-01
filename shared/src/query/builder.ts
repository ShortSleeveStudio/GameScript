// Query builder with fluent API
// Extracted from GameScriptElectron/src/renderer/src/lib/api/db/db-filter-interface.ts

import type { Row } from '../types/entities.js';
import type {
  QueryFilter,
  FilterSpec,
  FilterValue,
  FilterValueList,
  OrderDirection,
  WhereCondition,
  WhereGroup,
  ComparisonOperator,
} from './filter.js';

// Helper to convert operator to SQL
function operatorToSql(op: ComparisonOperator, dialect: 'sqlite' | 'postgres'): string {
  switch (op) {
    case 'eq': return '=';
    case 'ne': return dialect === 'postgres' ? '<>' : '!=';
    case 'lt': return '<';
    case 'lte': return '<=';
    case 'gt': return '>';
    case 'gte': return '>=';
    case 'like': return 'LIKE';
    case 'notLike': return 'NOT LIKE';
    case 'in': return 'IN';
    case 'notIn': return 'NOT IN';
    case 'isNull': return 'IS NULL';
    case 'isNotNull': return 'IS NOT NULL';
  }
}

// Implementation of QueryFilter interface
class QueryFilterImpl<RowType extends Row> implements QueryFilter<RowType> {
  private params: FilterValue[] = [];
  // Cache for toString()/whereClause() to avoid regenerating
  private _cachedString: string | null = null;
  private _cachedWhereClause: string | null = null;

  constructor(private spec: FilterSpec) {}

  private conditionToSql(condition: WhereCondition | WhereGroup, dialect: 'sqlite' | 'postgres'): string {
    if ('column' in condition) {
      // Single condition
      const col = dialect === 'sqlite' ? `"${condition.column}"` : condition.column;
      const op = operatorToSql(condition.operator, dialect);

      if (condition.operator === 'isNull' || condition.operator === 'isNotNull') {
        return `${col} ${op}`;
      }

      if (condition.operator === 'in' || condition.operator === 'notIn') {
        const values = condition.value as FilterValueList;
        const placeholders = values.map((v, i) => {
          this.params.push(v);
          return dialect === 'postgres' ? `$${this.params.length}` : '?';
        }).join(', ');
        return `${col} ${op} (${placeholders})`;
      }

      this.params.push(condition.value as FilterValue);
      const placeholder = dialect === 'postgres' ? `$${this.params.length}` : '?';
      return `${col} ${op} ${placeholder}`;
    } else {
      // Group of conditions
      const parts = condition.conditions.map(c => this.conditionToSql(c, dialect));
      const joiner = condition.operator === 'and' ? ' AND ' : ' OR ';
      return `(${parts.join(joiner)})`;
    }
  }

  toWhereClause(dialect: 'sqlite' | 'postgres'): string {
    this.params = [];
    if (!this.spec.where) return '';
    // Note: Returns just the condition, caller adds WHERE keyword
    return this.conditionToSql(this.spec.where, dialect);
  }

  toSqlSuffix(dialect: 'sqlite' | 'postgres'): string {
    this.params = [];
    const parts: string[] = [];

    if (this.spec.where) {
      parts.push('WHERE ' + this.conditionToSql(this.spec.where, dialect));
    }

    if (this.spec.orderBy && this.spec.orderBy.length > 0) {
      const orderParts = this.spec.orderBy.map(o => {
        const col = dialect === 'sqlite' ? `"${o.column}"` : o.column;
        return `${col} ${o.direction.toUpperCase()}`;
      });
      parts.push('ORDER BY ' + orderParts.join(', '));
    }

    if (this.spec.limit !== undefined) {
      parts.push(`LIMIT ${this.spec.limit}`);
    }

    if (this.spec.offset !== undefined) {
      parts.push(`OFFSET ${this.spec.offset}`);
    }

    return parts.join(' ');
  }

  getParameters(): FilterValue[] {
    return this.params;
  }

  /**
   * Check if a row matches a condition.
   * Missing columns are treated as "affected" (returns true) for safety.
   */
  private matchesCondition(row: RowType, condition: WhereCondition | WhereGroup): boolean {
    if ('column' in condition) {
      // Check if column exists in row - if not, treat as affected (safe default)
      if (!(condition.column in row)) {
        return true;
      }

      const value = row[condition.column as keyof RowType];

      switch (condition.operator) {
        case 'eq': return value === condition.value;
        case 'ne': return value !== condition.value;
        case 'lt': return (value as number) < (condition.value as number);
        case 'lte': return (value as number) <= (condition.value as number);
        case 'gt': return (value as number) > (condition.value as number);
        case 'gte': return (value as number) >= (condition.value as number);
        case 'like': {
          const pattern = (condition.value as string).replace(/%/g, '.*').replace(/_/g, '.');
          return new RegExp(`^${pattern}$`, 'i').test(value as string);
        }
        case 'notLike': {
          const pattern = (condition.value as string).replace(/%/g, '.*').replace(/_/g, '.');
          return !new RegExp(`^${pattern}$`, 'i').test(value as string);
        }
        case 'in': return (condition.value as FilterValueList).includes(value as FilterValue);
        case 'notIn': return !(condition.value as FilterValueList).includes(value as FilterValue);
        case 'isNull': return value === null || value === undefined;
        case 'isNotNull': return value !== null && value !== undefined;
      }
    } else {
      // Group
      if (condition.operator === 'and') {
        return condition.conditions.every(c => this.matchesCondition(row, c));
      } else {
        return condition.conditions.some(c => this.matchesCondition(row, c));
      }
    }
  }

  matches(row: RowType): boolean {
    if (!this.spec.where) return true;
    return this.matchesCondition(row, this.spec.where);
  }

  wouldAffectRows(rows: RowType[]): boolean {
    if (!rows || rows.length === 0) return false;
    for (let i = 0; i < rows.length; i++) {
      if (this.matches(rows[i])) {
        return true;
      }
    }
    return false;
  }

  getSpec(): FilterSpec {
    return this.spec;
  }

  getLimit(): number {
    return this.spec.limit ?? 0;
  }

  getOffset(): number {
    return this.spec.offset ?? 0;
  }

  equals(other: QueryFilter<RowType>): boolean {
    return this.toString() === other.toString();
  }

  toString(): string {
    if (this._cachedString === null) {
      this._cachedString = this.toSqlSuffix('sqlite');
    }
    return this._cachedString;
  }

  whereClause(): string {
    if (this._cachedWhereClause === null) {
      const clause = this.toWhereClause('sqlite');
      this._cachedWhereClause = clause ? `WHERE ${clause}` : '';
    }
    return this._cachedWhereClause;
  }
}

// Fluent builder for constructing filters
export class QueryBuilder<RowType extends Row> {
  private spec: FilterSpec = {};
  private currentGroup: WhereGroup | null = null;
  private groupStack: WhereGroup[] = [];

  // Start a where clause
  where(column: keyof RowType): ConditionBuilder<RowType> {
    return new ConditionBuilder(this, column as string);
  }

  // Add a condition to the current context
  addCondition(condition: WhereCondition): void {
    if (this.currentGroup) {
      this.currentGroup.conditions.push(condition);
    } else {
      this.spec.where = condition;
    }
  }

  // Start a new group with AND
  andGroup(): this {
    const newGroup: WhereGroup = { operator: 'and', conditions: [] };
    if (this.currentGroup) {
      this.currentGroup.conditions.push(newGroup);
    } else if (this.spec.where) {
      const rootGroup: WhereGroup = { operator: 'and', conditions: [this.spec.where, newGroup] };
      this.spec.where = rootGroup;
      this.groupStack.push(rootGroup);
    }
    this.groupStack.push(newGroup);
    this.currentGroup = newGroup;
    return this;
  }

  // Start a new group with OR
  orGroup(): this {
    const newGroup: WhereGroup = { operator: 'or', conditions: [] };
    if (this.currentGroup) {
      this.currentGroup.conditions.push(newGroup);
    } else if (this.spec.where) {
      const rootGroup: WhereGroup = { operator: 'or', conditions: [this.spec.where, newGroup] };
      this.spec.where = rootGroup;
      this.groupStack.push(rootGroup);
    }
    this.groupStack.push(newGroup);
    this.currentGroup = newGroup;
    return this;
  }

  // End current group
  endGroup(): this {
    this.groupStack.pop();
    this.currentGroup = this.groupStack.length > 0 ? this.groupStack[this.groupStack.length - 1] : null;
    return this;
  }

  // Add AND condition
  and(column: keyof RowType): ConditionBuilder<RowType> {
    if (!this.spec.where) {
      throw new Error('Cannot use and() without a prior condition');
    }
    if (!this.currentGroup) {
      const group: WhereGroup = { operator: 'and', conditions: [this.spec.where] };
      this.spec.where = group;
      this.currentGroup = group;
    }
    return new ConditionBuilder(this, column as string);
  }

  // Add OR condition
  or(column: keyof RowType): ConditionBuilder<RowType> {
    if (!this.spec.where) {
      throw new Error('Cannot use or() without a prior condition');
    }
    if (!this.currentGroup || this.currentGroup.operator !== 'or') {
      const group: WhereGroup = { operator: 'or', conditions: this.currentGroup ? [] : [this.spec.where] };
      if (this.currentGroup) {
        this.currentGroup.conditions.push(group);
      } else {
        this.spec.where = group;
      }
      this.currentGroup = group;
    }
    return new ConditionBuilder(this, column as string);
  }

  // Order by clause
  orderBy(column: keyof RowType, direction: OrderDirection = 'ASC'): this {
    if (!this.spec.orderBy) {
      this.spec.orderBy = [];
    }
    this.spec.orderBy.push({ column: column as string, direction });
    return this;
  }

  // Limit clause
  limit(count: number): this {
    this.spec.limit = count;
    return this;
  }

  // Offset clause
  offset(count: number): this {
    this.spec.offset = count;
    return this;
  }

  // Build the filter
  build(): QueryFilter<RowType> {
    return new QueryFilterImpl(this.spec);
  }
}

// Helper class for building individual conditions
export class ConditionBuilder<RowType extends Row> {
  constructor(
    private builder: QueryBuilder<RowType>,
    private column: string
  ) {}

  private complete(operator: ComparisonOperator, value?: FilterValue | FilterValueList): QueryBuilder<RowType> {
    this.builder.addCondition({ column: this.column, operator, value });
    return this.builder;
  }

  eq(value: FilterValue): QueryBuilder<RowType> { return this.complete('eq', value); }
  ne(value: FilterValue): QueryBuilder<RowType> { return this.complete('ne', value); }
  lt(value: number): QueryBuilder<RowType> { return this.complete('lt', value); }
  lte(value: number): QueryBuilder<RowType> { return this.complete('lte', value); }
  gt(value: number): QueryBuilder<RowType> { return this.complete('gt', value); }
  gte(value: number): QueryBuilder<RowType> { return this.complete('gte', value); }
  like(pattern: string): QueryBuilder<RowType> { return this.complete('like', pattern); }
  notLike(pattern: string): QueryBuilder<RowType> { return this.complete('notLike', pattern); }
  in(values: FilterValueList): QueryBuilder<RowType> { return this.complete('in', values); }
  notIn(values: FilterValueList): QueryBuilder<RowType> { return this.complete('notIn', values); }
  isNull(): QueryBuilder<RowType> { return this.complete('isNull'); }
  isNotNull(): QueryBuilder<RowType> { return this.complete('isNotNull'); }
}

// Factory function for creating query builders
export function query<RowType extends Row>(): QueryBuilder<RowType> {
  return new QueryBuilder<RowType>();
}

// Create an empty filter (matches all rows)
export function all<RowType extends Row>(): QueryFilter<RowType> {
  return new QueryFilterImpl<RowType>({});
}

// Create a filter directly from a FilterSpec (for merging filters)
export function createFilterFromSpec<RowType extends Row>(spec: FilterSpec): QueryFilter<RowType> {
  return new QueryFilterImpl<RowType>(spec);
}
