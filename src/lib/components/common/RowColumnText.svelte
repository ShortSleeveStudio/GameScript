<script lang="ts" generics="RowType extends Row">
    import type { Row } from '@lib/api/db/db-schema';
    import type { IDbRowView } from '@lib/api/db/db-view-row-interface';

    export let rowView: IDbRowView<RowType>;
    export let columnName: string;
</script>

<span class="overflow-ellipsis">
    {$rowView[columnName]}
</span>

<style>
    .overflow-ellipsis {
        display: block;
        text-overflow: ellipsis;
        white-space: nowrap;
        overflow: hidden;
        max-width: 100%;
    }
</style>
