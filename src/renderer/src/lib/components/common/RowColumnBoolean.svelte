<script lang="ts">
    import { db } from '@lib/api/db/db';
    import type { Row } from '@common/common-schema';
    import type { IDbRowView } from '@lib/api/db/db-view-row-interface';
    import { IsLoadingStore } from '@lib/stores/utility/is-loading-store';
    import { Undoable, undoManager } from '@lib/utility/undo-manager';
    import { Checkbox } from 'carbon-components-svelte';

    export let rowView: IDbRowView<Row>;
    export let columnName: string;
    export let undoText: string;

    const isLoading: IsLoadingStore = new IsLoadingStore();
    let boundValue: boolean;
    let currentValue: boolean;

    async function onCheck(): Promise<void> {
        const newValue: boolean = boundValue;
        const oldValue: boolean = currentValue;
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
                `${undoText} change`,
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

<Checkbox disabled={$isLoading} bind:checked={boundValue} on:check={onCheck} />
