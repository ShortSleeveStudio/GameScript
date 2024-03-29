<script lang="ts">
    import type { NodeProperty, PropertyTemplate } from '@common/common-schema';
    import type { IDbRowView } from '@lib/api/db/db-view-row-interface';
    import { nodePropertyTemplates } from '@lib/tables/node-property-templates';

    export let rowView: IDbRowView<NodeProperty>;

    let template: IDbRowView<PropertyTemplate>;
    $: {
        template = nodePropertyTemplates.getRowViewById($rowView.template);
    }
</script>

<span class="overflow-ellipsis">{$template.name}</span>

<style>
    .overflow-ellipsis {
        display: block;
        text-overflow: ellipsis;
        white-space: nowrap;
        overflow: hidden;
        max-width: 100%;
    }
</style>
