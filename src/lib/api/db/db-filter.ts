import type { Filter, FilterBuilder } from './db-filter-interface';
import { FilterBuilderSqlite } from './db-filter-sqlite';
import type { Row } from './db-schema';

class EmptyFilter<RowType extends Row> implements Filter<RowType> {
    wouldAffectRow(): boolean {
        return true;
    }
    wouldAffectRows(): boolean {
        return true;
    }
    toString(): string {
        return '';
    }
}

/**Factory for filters */
export function createFilter<RowType extends Row>(): FilterBuilder<RowType> {
    return new FilterBuilderSqlite<RowType>();
}

/**Factory for empty filters */
export function createEmptyFilter<RowType extends Row>(): Filter<RowType> {
    return new EmptyFilter();
}
