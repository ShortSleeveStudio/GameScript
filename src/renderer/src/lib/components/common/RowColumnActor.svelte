<script lang="ts">
    import SelectItemCustom from '../carbon/SelectItemCustom.svelte';
    import SelectCustom from '../carbon/SelectCustom.svelte';
    import type { IDbRowView } from '@lib/api/db/db-view-row-interface';
    import type { Row } from '@common/common-schema';
    import { IsLoadingStore } from '@lib/stores/utility/is-loading-store';
    import { actorsTable } from '@lib/tables/actors';
    import { db } from '@lib/api/db/db';
    import { Undoable, undoManager } from '@lib/utility/undo-manager';

    export let rowView: IDbRowView<Row>;
    export let columnName: string;
    $: onBackendUpdate($rowView);
    function onBackendUpdate(row: Row): void {
        const actorValue: number = <number>row[columnName];
        boundValue = actorValue;
        currentValue = boundValue;
    }

    const isLoading: IsLoadingStore = new IsLoadingStore();
    let boundValue: number;
    let currentValue: number;

    async function onActorSelected(): Promise<void> {
        const newValue: number = boundValue;
        const oldValue: number = currentValue;
        if (oldValue === newValue) return;

        // Update row
        const newRow = <Row>{ id: rowView.id };
        const oldRow = <Row>{ id: rowView.id };
        newRow[columnName] = newValue;
        oldRow[columnName] = oldValue;
        await isLoading.wrapPromise(db.updateRow(rowView.tableType, newRow));

        // Register undo/redo
        undoManager.register(
            new Undoable(
                `actor selection change`,
                isLoading.wrapFunction(async () => {
                    await db.updateRow(rowView.tableType, oldRow);
                }),
                isLoading.wrapFunction(async () => {
                    await db.updateRow(rowView.tableType, newRow);
                }),
            ),
        );
    }
</script>

<SelectCustom
    size="sm"
    disabled={$isLoading}
    on:change={onActorSelected}
    bind:selected={boundValue}
>
    {#each $actorsTable as actor (actor.id)}
        <SelectItemCustom rowView={actor} columnNameText={'name'} columnNameValue={'id'} />
    {/each}
</SelectCustom>
