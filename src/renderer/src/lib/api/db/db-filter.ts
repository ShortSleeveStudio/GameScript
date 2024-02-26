import type { Row } from '@common/common-schema';
import type { Filter, FilterBuilder } from './db-filter-interface';
import { FilterBuilderSqlite } from './db-filter-sqlite';

/**Factory for filters */
export function createFilter<RowType extends Row>(): FilterBuilder<RowType> {
    return new FilterBuilderSqlite<RowType>();
}

/**Factory for empty filters */
export function createEmptyFilter<RowType extends Row>(): Filter<RowType> {
    return new FilterBuilderSqlite<RowType>().build();
}
