<script lang="ts">
    import type { PropertyTemplate } from '@common/common-schema';
    import { PROPERTY_TYPES } from '@common/common-types';
    import type { IDbRowView } from '@lib/api/db/db-view-row-interface';

    export let rowView: IDbRowView<PropertyTemplate>;
</script>

<span class="overflow-ellipsis">
    {PROPERTY_TYPES[$rowView.type]}
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
