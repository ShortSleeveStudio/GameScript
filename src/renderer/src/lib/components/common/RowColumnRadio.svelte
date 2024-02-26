<script lang="ts">
    import type { Unsubscriber } from 'svelte/store';
    import { onDestroy } from 'svelte';
    import { IsLoadingStore } from '@lib/stores/utility/is-loading-store';
    import { db } from '@lib/api/db/db';
    import type { Routine, Row } from '@common/common-schema';
    import type { IDbRowView } from '@lib/api/db/db-view-row-interface';
    import { Undoable, undoManager } from '@lib/utility/undo-manager';
    import { RadioButton, RadioButtonGroup } from 'carbon-components-svelte';
    import { get } from 'svelte/store';

    export let rowView: IDbRowView<Routine>;
    export let principalStore: IDbRowView<Row>;
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

    async function onRadioChangedAsync(): Promise<void> {
        const originalRow: Row = { ...get(principalStore) };
        const newRow: Row = { ...get(principalStore) };
        newRow.principal = rowView.id;
        await isLoading.wrapPromise(db.updateRow(principalStore.tableType, newRow));

        // Register undo/redo
        undoManager.register(
            new Undoable(
                `${undoText} change`,
                isLoading.wrapFunction(async () => {
                    await db.updateRow(principalStore.tableType, originalRow);
                }),
                isLoading.wrapFunction(async () => {
                    await db.updateRow(principalStore.tableType, newRow);
                }),
            ),
        );
    }

    function onPrincipalChanged(principalRow: Row): void {
        checked = rowView.id === principalRow.principal;
    }

    function onPrincipalStoreChanged(principalRowView: IDbRowView<Row>): void {
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
