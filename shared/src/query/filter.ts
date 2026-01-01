// Filter types for database queries
// Extracted from GameScriptElectron/src/renderer/src/lib/api/db/db-filter-interface.ts

import type { Row } from '../types/entities.js';

export const ASC = 'ASC' as const;
export const DESC = 'DESC' as const;
export type OrderDirection = 'ASC' | 'DESC' | 'asc' | 'desc';

// Column value types that can be used in filters
export type FilterValue = string | number | boolean | null;
export type FilterValueList = FilterValue[];

// Operator types for where clauses
export type ComparisonOperator = 'eq' | 'ne' | 'lt' | 'lte' | 'gt' | 'gte' | 'like' | 'notLike' | 'in' | 'notIn' | 'isNull' | 'isNotNull';
export type LogicalOperator = 'and' | 'or';

// A single condition in a where clause
export interface WhereCondition {
  column: string;
  operator: ComparisonOperator;
  value?: FilterValue | FilterValueList;
}

// A group of conditions combined with a logical operator
export interface WhereGroup {
  operator: LogicalOperator;
  conditions: (WhereCondition | WhereGroup)[];
}

// Order by clause
export interface OrderByClause {
  column: string;
  direction: OrderDirection;
}

// Complete filter specification (database-agnostic)
export interface FilterSpec {
  where?: WhereCondition | WhereGroup;
  orderBy?: OrderByClause[];
  limit?: number;
  offset?: number;
}

// Query filter interface that implementations must satisfy
export interface QueryFilter<RowType extends Row> {
  // Get the SQL WHERE clause (without the WHERE keyword)
  toWhereClause(dialect: 'sqlite' | 'postgres'): string;

  // Get the full SQL suffix (WHERE, ORDER BY, LIMIT, OFFSET)
  toSqlSuffix(dialect: 'sqlite' | 'postgres'): string;

  // Get bound parameters for prepared statements
  getParameters(): FilterValue[];

  // Check if a row matches this filter (for client-side filtering)
  // Missing columns are treated as "affected" (returns true) for safety
  matches(row: RowType): boolean;

  // Check if any of the rows would be affected by this filter
  // Used to determine if table views need to reload after data changes
  wouldAffectRows(rows: RowType[]): boolean;

  // Get the underlying spec
  getSpec(): FilterSpec;

  // Get limit value (0 if not set)
  getLimit(): number;

  // Get offset value (0 if not set)
  getOffset(): number;

  // Check equality with another filter
  equals(other: QueryFilter<RowType>): boolean;

  // Get string representation (full SQL suffix for sqlite dialect)
  toString(): string;

  // Get WHERE clause string (with WHERE keyword, for sqlite dialect)
  whereClause(): string;
}
