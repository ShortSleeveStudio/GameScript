import type { Row } from './db-schema';

/**Column types for a filter */
export type FilterColumnType = string | number | boolean;

/**Column list types for a filter */
export type FilterColumnListType = FilterColumnType[];

/**Builds filters for database queries */
export interface FilterBuilder<RowType extends Row> {
    where(fieldName: keyof RowType): WhereClauseOperatorSelector<RowType>;
    openScope(): FilterBuilder<RowType>;
}

/**Builds where clauses for database queries */
export interface WhereClauseOperatorSelector<RowType extends Row> {
    is(value: FilterColumnType): FilterCompleteOrContinue<RowType>;
    isNot(value: FilterColumnType): FilterCompleteOrContinue<RowType>;
    like(value: string): FilterCompleteOrContinue<RowType>;
    notLike(value: string): FilterCompleteOrContinue<RowType>;
    lt(value: FilterColumnType): FilterCompleteOrContinue<RowType>;
    lte(value: FilterColumnType): FilterCompleteOrContinue<RowType>;
    gt(value: FilterColumnType): FilterCompleteOrContinue<RowType>;
    gte(value: FilterColumnType): FilterCompleteOrContinue<RowType>;
    in(value: FilterColumnListType): FilterCompleteOrContinue<RowType>;
    notIn(value: FilterColumnListType): FilterCompleteOrContinue<RowType>;
}

/**Continues or completes building where clauses for database queries */
export interface FilterCompleteOrContinue<RowType extends Row> {
    and(): FilterBuilder<RowType>;
    or(): FilterBuilder<RowType>;
    closeScope(): FilterCompleteOrContinue<RowType>;
    build(): Filter<RowType>;
}

/**This doesn't expose any functionality, but it used to pass to the database table view methods */
export interface Filter<RowType extends Row> {
    toString(): string;
    wouldAffectRow(row: RowType): boolean;
    wouldAffectRows(rows: RowType[]): boolean;
}
