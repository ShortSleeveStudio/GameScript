<script lang="ts">
    import { db } from '@lib/api/db/db';
    import { createFilter } from '@lib/api/db/db-filter';
    import { type Localization, type Row } from '@common/common-schema';
    import type { IDbRowView } from '@lib/api/db/db-view-row-interface';
    import type { IDbTableView } from '@lib/api/db/db-view-table-interface';
    import { onDestroy, onMount } from 'svelte';
    import InspectorLocalization from '../inspector/InspectorLocalization.svelte';
    import { Tile } from 'carbon-components-svelte';
    import { TABLE_LOCALIZATIONS } from '@common/common-types';

    export let rowView: IDbRowView<Row>;
    export let columnName: string;
    export let showTitle: boolean = false;
    export let showId: boolean = true;
    export let showNickname: boolean = true;

    let localizationTableView: IDbTableView<Localization>;

    onMount(() => {
        localizationTableView = db.fetchTable(
            TABLE_LOCALIZATIONS,
            createFilter<Localization>()
                .where()
                .column('id')
                .eq(<number>$rowView[columnName])
                .endWhere()
                .build(),
        );
    });

    onDestroy(() => {
        // Destroy tables and subscriptions
        if (localizationTableView) db.releaseTable(localizationTableView);
    });
</script>

{#if localizationTableView}
    <Tile>
        {#each $localizationTableView as localizationRowView (localizationRowView.id)}
            <InspectorLocalization
                rowView={localizationRowView}
                {showTitle}
                {showId}
                {showNickname}
                showLocalizationButton={true}
            />
        {/each}
    </Tile>
{/if}
