/**
 * Helper functions for converting AG-Grid filter models to our query filter format.
 *
 * Ported from GameScriptElectron, updated to use QueryBuilder from @gamescript/shared.
 */

import type {
    ICombinedSimpleModel,
    ISimpleFilterModel,
    JoinOperator,
    NumberFilterModel,
    ProvidedFilterModel,
    TextFilterModel,
} from '@ag-grid-community/core';
import type { Row, QueryFilter, QueryBuilder, ConditionBuilder } from '@gamescript/shared';
import type { BooleanFilterModel } from './filter-boolean.js';

// ============================================================================
// Main Function
// ============================================================================

/**
 * Build a filter with WHERE clause from AG-Grid filter model.
 * Takes a QueryBuilder that may already have limit/offset/orderBy set,
 * adds WHERE conditions from the AG-Grid filter model, and returns the built filter.
 */
export function datasourceFilterWhere<RowType extends Row>(
    filterBuilder: QueryBuilder<RowType>,
    paramFilterModel: unknown,
): QueryFilter<RowType> {
    const filterColumns: string[] = Object.keys(paramFilterModel as object);

    if (filterColumns.length === 0) {
        return filterBuilder.build();
    }

    // Process each column's filter
    for (let colIndex = 0; colIndex < filterColumns.length; colIndex++) {
        const column: string = filterColumns[colIndex];
        const filterModel: ProvidedFilterModel = (paramFilterModel as Record<string, ProvidedFilterModel>)[column];

        // Check if this requires a join (multiple conditions on same column)
        let filters: ISimpleFilterModel[];
        let joinOperator: JoinOperator | undefined;

        if ('conditions' in filterModel) {
            const combinedModel = filterModel as ICombinedSimpleModel<
                TextFilterModel | NumberFilterModel
            >;
            joinOperator = combinedModel.operator;
            filters = combinedModel.conditions ?? [];
        } else {
            filters = [filterModel];
        }

        // Process each filter condition for this column
        for (let filterIndex = 0; filterIndex < filters.length; filterIndex++) {
            const isFirstCondition = colIndex === 0 && filterIndex === 0;

            let conditionBuilder: ConditionBuilder<RowType>;

            if (isFirstCondition) {
                // First condition starts with where()
                conditionBuilder = filterBuilder.where(column as keyof RowType);
            } else if (filterIndex > 0) {
                // Multiple conditions on same column - use the join operator
                if (joinOperator === 'OR') {
                    conditionBuilder = filterBuilder.or(column as keyof RowType);
                } else {
                    // Default to AND
                    conditionBuilder = filterBuilder.and(column as keyof RowType);
                }
            } else {
                // Different column - always AND between columns
                conditionBuilder = filterBuilder.and(column as keyof RowType);
            }

            // Apply the condition and update filterBuilder
            filterBuilder = applyCondition(
                conditionBuilder,
                filterModel.filterType ?? 'text',
                filters[filterIndex],
            );
        }
    }

    return filterBuilder.build();
}

// ============================================================================
// Condition Application
// ============================================================================

/**
 * Apply a filter condition to the condition builder.
 * Returns the QueryBuilder for continued chaining.
 */
function applyCondition<RowType extends Row>(
    conditionBuilder: ConditionBuilder<RowType>,
    filterType: string,
    filterModel: ISimpleFilterModel,
): QueryBuilder<RowType> {
    switch (filterType) {
        case 'text':
            return applyTextFilter(conditionBuilder, filterModel as TextFilterModel);
        case 'number':
            return applyNumberFilter(conditionBuilder, filterModel as NumberFilterModel);
        case 'boolean':
            return applyBooleanFilter(conditionBuilder, filterModel as BooleanFilterModel);
        default:
            throw new Error(`Unknown filter type: ${filterType}`);
    }
}

function applyTextFilter<RowType extends Row>(
    conditionBuilder: ConditionBuilder<RowType>,
    textFilterModel: TextFilterModel,
): QueryBuilder<RowType> {
    switch (textFilterModel.type) {
        case 'equals':
            return conditionBuilder.eq(textFilterModel.filter ?? '');
        case 'notEqual':
            return conditionBuilder.ne(textFilterModel.filter ?? '');
        case 'contains':
            return conditionBuilder.like(`%${textFilterModel.filter}%`);
        case 'notContains':
            return conditionBuilder.notLike(`%${textFilterModel.filter}%`);
        case 'startsWith':
            return conditionBuilder.like(`${textFilterModel.filter}%`);
        case 'endsWith':
            return conditionBuilder.like(`%${textFilterModel.filter}`);
        default:
            throw new Error(`Unknown filter operation: ${textFilterModel.type}`);
    }
}

function applyNumberFilter<RowType extends Row>(
    conditionBuilder: ConditionBuilder<RowType>,
    numberFilterModel: NumberFilterModel,
): QueryBuilder<RowType> {
    switch (numberFilterModel.type) {
        case 'equals':
            return conditionBuilder.eq(numberFilterModel.filter ?? 0);
        case 'notEqual':
            return conditionBuilder.ne(numberFilterModel.filter ?? 0);
        case 'lessThan':
            return conditionBuilder.lt(numberFilterModel.filter ?? 0);
        case 'lessThanOrEqual':
            return conditionBuilder.lte(numberFilterModel.filter ?? 0);
        case 'greaterThan':
            return conditionBuilder.gt(numberFilterModel.filter ?? 0);
        case 'greaterThanOrEqual':
            return conditionBuilder.gte(numberFilterModel.filter ?? 0);
        default:
            throw new Error(`Unknown filter operation: ${numberFilterModel.type}`);
    }
}

function applyBooleanFilter<RowType extends Row>(
    conditionBuilder: ConditionBuilder<RowType>,
    booleanFilterModel: BooleanFilterModel,
): QueryBuilder<RowType> {
    switch (booleanFilterModel.type) {
        case 'equals':
            return conditionBuilder.eq(booleanFilterModel.filter ?? false);
        default:
            throw new Error(`Unknown filter operation: ${booleanFilterModel.type}`);
    }
}
