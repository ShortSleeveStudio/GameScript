<script lang="ts" generics="RowType extends Principaled, Row">
    import type { Unsubscriber } from 'svelte/store';
    import { onDestroy } from 'svelte';
    import { IsLoadingStore } from '@lib/stores/utility/is-loading-store';
    import { db } from '@lib/api/db/db';
    import type { Principaled, Routine, Row } from '@lib/api/db/db-schema';
    import type { IDbRowView } from '@lib/api/db/db-view-row-interface';
    import { Undoable, undoManager } from '@lib/utility/undo-manager';
    import { RadioButton, RadioButtonGroup } from 'carbon-components-svelte';
    import { get } from 'svelte/store';

    export let rowView: IDbRowView<Routine>;
    export let principalStore: IDbRowView<RowType>;
    export let undoText: string;

    const isLoading: IsLoadingStore = new IsLoadingStore();
    let checked: boolean = principalStore ? rowView.id === $principalStore.principal : false;
    let principalStoreUnsubscriber: Unsubscriber;
    $: onPrincipalStoreChanged(principalStore);

    async function onRadioChanged(e: Event): Promise<void> {
        if (!principalStore) return;
        (<HTMLElement>e.target).blur(); // Allows us to undo/redo
        checked = true;
        await onRadioChangedAsync();
    }

    const onRadioChangedAsync: () => Promise<void> = isLoading.wrapOperationAsync(async () => {
        const originalRow: RowType = { ...get(principalStore) };
        const newRow: RowType = { ...get(principalStore) };
        newRow.principal = rowView.id;
        await db.updateRow(principalStore.tableId, newRow);

        // Register undo/redo
        undoManager.register(
            new Undoable(
                `${undoText} change`,
                isLoading.wrapOperationAsync(async () => {
                    await db.updateRow(principalStore.tableId, originalRow);
                }),
                isLoading.wrapOperationAsync(async () => {
                    await db.updateRow(principalStore.tableId, newRow);
                }),
            ),
        );
    });

    function onPrincipalChanged(principalRow: RowType): void {
        checked = rowView.id === principalRow.principal;
    }

    function onPrincipalStoreChanged(principalRowView: IDbRowView<RowType>): void {
        if (principalStoreUnsubscriber) principalStoreUnsubscriber();
        if (principalRowView) {
            principalStoreUnsubscriber = principalRowView.subscribe(onPrincipalChanged);
        }
    }

    onDestroy(() => {
        if (principalStoreUnsubscriber) principalStoreUnsubscriber();
    });
</script>

<RadioButtonGroup>
    <RadioButton value={rowView.id} bind:checked on:change={onRadioChanged} />
</RadioButtonGroup>
