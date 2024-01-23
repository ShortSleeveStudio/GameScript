<script lang="ts">
    // TODO - consider deleting
    // import { db } from '@lib/api/db/db';
    // import { createFilter } from '@lib/api/db/db-filter';
    // import { TABLE_ID_PROPERTIES, type DatabaseTableId, type Row } from '@lib/api/db/db-schema';
    // import type { IDbRowView } from '@lib/api/db/db-view-row-interface';
    // import type { IDbTableView } from '@lib/api/db/db-view-table-interface';
    // import { tableIdToFkColumnName } from '@lib/utility/properties';
    // import { Tile } from 'carbon-components-svelte';
    // import { onDestroy, onMount } from 'svelte';
    // import RowColumnProperty from './RowColumnProperty.svelte';

    // export let rowView: IDbRowView<Row>;
    // export let rowType: DatabaseTableId;

    // let propertyTableView: IDbTableView<Row>;

    // onMount(() => {
    //     propertyTableView = db.fetchTable(
    //         TABLE_ID_PROPERTIES,
    //         createFilter()
    //             .where('parentType')
    //             .is(rowType)
    //             .and()
    //             .where(tableIdToFkColumnName(rowType))
    //             .is(rowView.id)
    //             .build(),
    //     );
    // });
    // onDestroy(() => {
    //     db.releaseTable(propertyTableView);
    // });
</script>

<!-- {#if propertyTableView}
    <Tile>
        {#each $propertyTableView as property (property.id)}
            <RowColumnProperty rowView={property} />
        {/each}
    </Tile>
{/if} -->
