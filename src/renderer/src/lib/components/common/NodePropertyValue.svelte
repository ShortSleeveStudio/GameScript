<script lang="ts">
    import type { NodeProperty, NodePropertyTemplate } from '@common/common-schema';
    import {
        PROPERTY_TYPE_BOOLEAN,
        PROPERTY_TYPE_DECIMAL,
        PROPERTY_TYPE_INTEGER,
        PROPERTY_TYPE_STRING,
    } from '@common/common-types';
    import type { IDbRowView } from '@lib/api/db/db-view-row-interface';
    import { nodePropertyTemplates } from '@lib/tables/node-property-templates';
    import RowColumnInput from './RowColumnInput.svelte';
    import {
        NODE_PROPERTY_PLACEHOLDER_VALUE_DECIMAL,
        NODE_PROPERTY_PLACEHOLDER_VALUE_INTEGER,
        NODE_PROPERTY_PLACEHOLDER_VALUE_STRING,
        NODE_PROPERTY_UNDO_VALUE,
    } from '@lib/constants/settings';
    import RowColumnBoolean from './RowColumnBoolean.svelte';

    export let rowView: IDbRowView<NodeProperty>;

    let template: IDbRowView<NodePropertyTemplate>;
    $: {
        template = nodePropertyTemplates.getRowViewById($rowView.template);
    }
</script>

{#if $template.type === PROPERTY_TYPE_STRING.id}
    <RowColumnInput
        {rowView}
        columnName={'value_string'}
        undoText={NODE_PROPERTY_UNDO_VALUE}
        inputPlaceholder={NODE_PROPERTY_PLACEHOLDER_VALUE_STRING}
    />
{:else if $template.type === PROPERTY_TYPE_INTEGER.id}
    <RowColumnInput
        {rowView}
        columnName={'value_integer'}
        undoText={NODE_PROPERTY_UNDO_VALUE}
        inputPlaceholder={NODE_PROPERTY_PLACEHOLDER_VALUE_INTEGER}
        isNumber={true}
        numberMin={-2147483648}
        numberMax={2147483647}
    />
{:else if $template.type === PROPERTY_TYPE_DECIMAL.id}
    <RowColumnInput
        {rowView}
        columnName={'value_decimal'}
        undoText={NODE_PROPERTY_UNDO_VALUE}
        inputPlaceholder={NODE_PROPERTY_PLACEHOLDER_VALUE_DECIMAL}
        isNumber={true}
        isDecimal={true}
    />
{:else if $template.type === PROPERTY_TYPE_BOOLEAN.id}
    <RowColumnBoolean {rowView} columnName={'value_boolean'} undoText={NODE_PROPERTY_UNDO_VALUE} />
{/if}
