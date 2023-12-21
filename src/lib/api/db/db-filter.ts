// /**Column types for a filter */
// export type FilterColumnType = string | number | boolean;

// /**Column list types for a filter */
// export type FilterColumnListType = FilterColumnType[];

// /**Builds filters for database queries */
// export interface FilterBuilder {
//     where(fieldName: string): WhereClauseOperatorSelector;
// }

// /**Builds where clauses for database queries */
// export interface WhereClauseOperatorSelector {
//     is(value: FilterColumnType): FilterCompleteOrContinue;
//     isNot(value: FilterColumnType): FilterCompleteOrContinue;
//     like(value: FilterColumnType): FilterCompleteOrContinue;
//     notLike(value: FilterColumnType): FilterCompleteOrContinue;
//     lt(value: FilterColumnType): FilterCompleteOrContinue;
//     lte(value: FilterColumnType): FilterCompleteOrContinue;
//     gt(value: FilterColumnType): FilterCompleteOrContinue;
//     gte(value: FilterColumnType): FilterCompleteOrContinue;
//     in(value: FilterColumnListType): FilterCompleteOrContinue;
// }

// /**Continues or completes building where clauses for database queries */
// export interface FilterCompleteOrContinue {
//     and(): WhereClauseOperatorSelector;
//     or(): WhereClauseOperatorSelector;
//     build(): Filter;
// }

// /**This doesn't expose any functionality, but it used to pass to the database table view methods */
// export interface Filter {}
