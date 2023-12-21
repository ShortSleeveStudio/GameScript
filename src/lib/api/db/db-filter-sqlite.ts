// import type {
//     Filter,
//     FilterBuilder,
//     FilterColumnListType,
//     FilterColumnType,
//     FilterCompleteOrContinue,
//     WhereClauseOperatorSelector,
// } from './db-filter';

// interface Where {
//     leftOperand: string;
//     operator: string;
//     operandRight: FilterColumnType;
// }
// type FilterOperator = '=' | '!=' | '<' | '>' | '<=' | '>=' | 'LIKE' | 'NOT LIKE';
// type FilterContinueKeyword = 'AND' | 'OR';
// type FilterInKeyword = 'IN' | 'NOT IN';

// /**@internal */
// export class FilterBuilderSqlite
//     implements FilterBuilder, WhereClauseOperatorSelector, FilterCompleteOrContinue, Filter
// {
//     private _ors: Where[];
//     private _ands: Where[];
//     private _currentClause: (newOr: Where) => void;

//     constructor() {
//         this._ors = [];
//         this._ands = [];
//         this._currentClause = this.addOr;
//     }

//     in(value: FilterColumnListType): FilterCompleteOrContinue {
//         return this;
//     }
//     where(fieldName: string): WhereClauseOperatorSelector {
//         this._currentClause = this.addAnd;
//         return this;
//     }
//     is(value: FilterColumnType): FilterCompleteOrContinue {
//         return this;
//     }
//     isNot(value: FilterColumnType): FilterCompleteOrContinue {
//         return this;
//     }
//     like(value: FilterColumnType): FilterCompleteOrContinue {
//         return this;
//     }
//     notLike(value: FilterColumnType): FilterCompleteOrContinue {
//         return this;
//     }
//     lt(value: FilterColumnType): FilterCompleteOrContinue {
//         return this;
//     }
//     lte(value: FilterColumnType): FilterCompleteOrContinue {
//         return this;
//     }
//     gt(value: FilterColumnType): FilterCompleteOrContinue {
//         return this;
//     }
//     gte(value: FilterColumnType): FilterCompleteOrContinue {
//         return this;
//     }
//     and(): WhereClauseOperatorSelector {
//         return this;
//     }
//     or(): WhereClauseOperatorSelector {
//         return this;
//     }
//     build(): Filter {
//         return this;
//     }

//     private addOr(newOr: Where): void {
//         this._ors.push(newOr);
//     }

//     private addAnd(newAnd: Where): void {
//         this._ands.push(newAnd);
//     }
// }

// // /**@internal */
// // export class WhereClauseOperatorSelectorSqlite implements WhereClauseOperatorSelector {
// //     is(value: FilterColumnType): FilterCompleteOrContinue {
// //         throw new Error('Method not implemented.');
// //     }
// //     isNot(value: FilterColumnType): FilterCompleteOrContinue {
// //         throw new Error('Method not implemented.');
// //     }
// //     like(value: FilterColumnType): FilterCompleteOrContinue {
// //         throw new Error('Method not implemented.');
// //     }
// //     notLike(value: FilterColumnType): FilterCompleteOrContinue {
// //         throw new Error('Method not implemented.');
// //     }
// //     lt(value: FilterColumnType): FilterCompleteOrContinue {
// //         throw new Error('Method not implemented.');
// //     }
// //     lte(value: FilterColumnType): FilterCompleteOrContinue {
// //         throw new Error('Method not implemented.');
// //     }
// //     gt(value: FilterColumnType): FilterCompleteOrContinue {
// //         throw new Error('Method not implemented.');
// //     }
// //     gte(value: FilterColumnType): FilterCompleteOrContinue {
// //         throw new Error('Method not implemented.');
// //     }
// // }

// // /**@internal */
// // export class FilterCompleteOrContinueSqlite implements FilterCompleteOrContinue {
// //     and(): WhereClauseOperatorSelector;
// //     or(): WhereClauseOperatorSelector;
// //     build(): Filter;
// // }

// // /**@internal */
// // export class FilterSqlite implements Filter {}
