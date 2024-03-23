import type {
    ICombinedSimpleModel,
    ISimpleFilterModel,
    JoinOperator,
    NumberFilterModel,
    ProvidedFilterModel,
    TextFilterModel,
} from '@ag-grid-community/core';
import type { Row } from '@common/common-schema';
import type {
    Filter,
    FilterBuilder,
    WhereAndOrCloseScopeEnd,
    WhereColumnOrOpenScope,
    WherePredicate,
} from '@lib/api/db/db-filter-interface';
import type { BooleanFilterModel } from './grid-filter-boolean';

export function datasourceFilterWhere<RowType extends Row>(
    filterBuilder: FilterBuilder<RowType>,
    paramFilterModel: unknown,
): Filter<RowType> {
    const filterColumns: string[] = Object.keys(paramFilterModel);
    if (filterColumns.length > 0) {
        let whereBuilder: WhereColumnOrOpenScope<RowType> = filterBuilder.where();
        for (let i = 0; i < filterColumns.length; i++) {
            const column: string = filterColumns[i];
            const filterModel: ProvidedFilterModel = paramFilterModel[column];

            // Check if this requires a join
            let filters: ISimpleFilterModel[];
            let joinOperator: JoinOperator;
            if ('conditions' in filterModel) {
                const combinedModel = filterModel as ICombinedSimpleModel<
                    TextFilterModel | NumberFilterModel
                >;
                joinOperator = combinedModel.operator;
                filters = combinedModel.conditions;
            } else {
                filters = [filterModel];
            }

            // Iterate over all filters for this column
            let whereAndOrClose: WhereAndOrCloseScopeEnd<RowType>;
            for (let j = 0; j < filters.length; j++) {
                const wherePredicate: WherePredicate<RowType> = whereBuilder.column(column);
                switch (filterModel.filterType) {
                    case 'text': {
                        whereAndOrClose = handleTextFilter(
                            wherePredicate,
                            <TextFilterModel>filters[j],
                        );
                        break;
                    }
                    case 'number': {
                        whereAndOrClose = handleNumberFilter(
                            wherePredicate,
                            <NumberFilterModel>filters[j],
                        );
                        break;
                    }
                    case 'boolean': {
                        whereAndOrClose = handleBooleanFilter(
                            wherePredicate,
                            <BooleanFilterModel>filters[j],
                        );
                        break;
                    }
                    default:
                        throw new Error(`Unknown filter type: ${filterModel.filterType}`);
                }
                if (j !== filters.length - 1) {
                    switch (joinOperator) {
                        case 'AND':
                            whereBuilder = whereAndOrClose.and();
                            break;
                        case 'OR':
                            whereBuilder = whereAndOrClose.or();
                            break;
                    }
                }
            }

            // If this isn't the last column, add an 'AND'
            // If this is the last column, end the where clause
            if (i !== filterColumns.length - 1) {
                whereBuilder = whereAndOrClose.and();
            } else {
                return whereAndOrClose.endWhere().build();
            }
        }
    } else {
        return filterBuilder.build();
    }
    throw new Error('Unexpectedly exited filter builder');
}

function handleTextFilter<RowType extends Row>(
    whereBuilder: WherePredicate<RowType>,
    textFilterModel: TextFilterModel,
): WhereAndOrCloseScopeEnd<RowType> {
    switch (textFilterModel.type) {
        case 'equals':
            return whereBuilder.eq(textFilterModel.filter);
        case 'notEqual':
            return whereBuilder.ne(textFilterModel.filter);
        case 'contains':
            return whereBuilder.like(`%${textFilterModel.filter}%`);
        case 'notContains':
            return whereBuilder.notLike(`%${textFilterModel.filter}%`);
        case 'startsWith':
            return whereBuilder.like(`${textFilterModel.filter}%`);
        case 'endsWith':
            return whereBuilder.like(`%${textFilterModel.filter}`);
        default:
            throw new Error(`Unknown filter operation: ${textFilterModel.type}`);
    }
}

function handleNumberFilter<RowType extends Row>(
    whereBuilder: WherePredicate<RowType>,
    numberFilterModel: NumberFilterModel,
): WhereAndOrCloseScopeEnd<RowType> {
    switch (numberFilterModel.type) {
        case 'equals':
            return whereBuilder.eq(numberFilterModel.filter);
        case 'notEqual':
            return whereBuilder.ne(numberFilterModel.filter);
        case 'lessThan':
            return whereBuilder.lt(numberFilterModel.filter);
        case 'lessThanOrEqual':
            return whereBuilder.lte(numberFilterModel.filter);
        case 'greaterThan':
            return whereBuilder.gt(numberFilterModel.filter);
        case 'greaterThanOrEqual':
            return whereBuilder.gte(numberFilterModel.filter);
        default:
            throw new Error(`Unknown filter operation: ${numberFilterModel.type}`);
    }
}

function handleBooleanFilter<RowType extends Row>(
    whereBuilder: WherePredicate<RowType>,
    booleanFilterModel: BooleanFilterModel,
): WhereAndOrCloseScopeEnd<RowType> {
    switch (booleanFilterModel.type) {
        case 'equals':
            return whereBuilder.eq(booleanFilterModel.filter);
        default:
            throw new Error(`Unknown filter operation: ${booleanFilterModel.type}`);
    }
}
