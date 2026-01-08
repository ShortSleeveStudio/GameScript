<script lang="ts">
    /**
     * Custom properties editor for nodes.
     *
     * Thin wrapper around RowColumnEntityProperties configured for nodes.
     */
    import type { Row } from '@gamescript/shared';
    import { TABLE_NODES, TABLE_NODE_PROPERTIES } from '@gamescript/shared';
    import type { IDbRowView } from '$lib/db';
    import { nodeProperties } from '$lib/crud';
    import RowColumnEntityProperties from './RowColumnEntityProperties.svelte';

    interface Props {
        rowView: IDbRowView<Row>;
    }

    let { rowView }: Props = $props();
</script>

<RowColumnEntityProperties
    {rowView}
    entityTableRef={TABLE_NODES}
    propertiesTableRef={TABLE_NODE_PROPERTIES}
    propertyCrud={nodeProperties}
/>
