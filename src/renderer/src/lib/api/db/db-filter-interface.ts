import type { Row } from './db-schema';

export const ASC = 'ASC';
export const DESC = 'DESC';
export const ORDER_NAMES = [ASC, DESC, 'asc', 'desc'] as const;
export type OrderType = (typeof ORDER_NAMES)[number];

/**Column types for a filter */
export type FilterColumnType = string | number | boolean;

/**Column list types for a filter */
export type FilterColumnListType = FilterColumnType[];

/**Builds filters for database queries */
export type FilterBuilder<RowType extends Row> = {
    where(): WhereColumnOrOpenScope<RowType>;
    orderBy(fieldName: keyof RowType, order: OrderType): FilterBuilder<RowType>;
    limit(limit: number): FilterBuilder<RowType>;
    offset(offset: number): FilterBuilder<RowType>;
    build(): Filter<RowType>;
};
export type WhereColumnOrOpenScope<RowType extends Row> = {
    column(fieldName: keyof RowType): WherePredicate<RowType>;
    openScope(): WhereColumnOrOpenScope<RowType>;
};
export type WherePredicate<RowType extends Row> = {
    eq(value: FilterColumnType): WhereAndOrCloseScopeEnd<RowType>;
    ne(value: FilterColumnType): WhereAndOrCloseScopeEnd<RowType>;
    like(value: string): WhereAndOrCloseScopeEnd<RowType>;
    notLike(value: string): WhereAndOrCloseScopeEnd<RowType>;
    lt(value: FilterColumnType): WhereAndOrCloseScopeEnd<RowType>;
    lte(value: FilterColumnType): WhereAndOrCloseScopeEnd<RowType>;
    gt(value: FilterColumnType): WhereAndOrCloseScopeEnd<RowType>;
    gte(value: FilterColumnType): WhereAndOrCloseScopeEnd<RowType>;
    in(value: FilterColumnListType): WhereAndOrCloseScopeEnd<RowType>;
    notIn(value: FilterColumnListType): WhereAndOrCloseScopeEnd<RowType>;
};
export type WhereAndOrCloseScopeEnd<RowType extends Row> = {
    and(): WhereColumnOrOpenScope<RowType>;
    or(): WhereColumnOrOpenScope<RowType>;
    closeScope(): WhereAndOrCloseScopeEnd<RowType>;
    endWhere(): OrderLimitOffsetBuild<RowType>;
};
export type OrderLimitOffsetBuild<RowType extends Row> = {
    orderBy(fieldName: keyof RowType, order: OrderType): OrderLimitOffsetBuild<RowType>;
    limit(limit: number): OrderLimitOffsetBuild<RowType>;
    offset(offset: number): OrderLimitOffsetBuild<RowType>;
    build(): Filter<RowType>;
};

/**This doesn't expose any functionality, but it used to pass to the database table view methods */
export interface Filter<RowType extends Row> {
    toString(): string;
    wouldAffectRow(row: RowType): boolean;
    wouldAffectRows(rows: RowType[]): boolean;
    equals(other: Filter<RowType>): boolean;
    getOffset(): number;
    getLimit(): number;
}
