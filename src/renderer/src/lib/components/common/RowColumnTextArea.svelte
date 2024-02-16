<script lang="ts">
    import { db } from '@lib/api/db/db';
    import { IsLoadingStore } from '@lib/stores/utility/is-loading-store';
    import { Undoable, undoManager } from '@lib/utility/undo-manager';
    import { get } from 'svelte/store';
    import { wasEnterPressed, wasSavePressed } from '@lib/utility/keybinding';
    import { type Row } from '@lib/api/db/db-schema';
    import type { IDbRowView } from '@lib/api/db/db-view-row-interface';
    import TextAreaCustom from '../carbon/TextAreaCustom.svelte';

    export let rowView: IDbRowView<Row>;
    export let undoText: string;
    export let columnName: string;
    export let placeholder: string;
    export let resizable: boolean = true;
    export let disabled: boolean = false;
    export let stopDefault: boolean = false;
    export let disableBorder: boolean = false;
    export let labelText: string = '';

    const isLoading: IsLoadingStore = new IsLoadingStore();
    let boundValue: string;
    let currentValue: string;

    $: {
        const row: Row = $rowView;
        // If the name of this row has changed, we remove it from the map and add the new name
        if (row && row[columnName] !== currentValue) {
            boundValue = <string>row[columnName];
            currentValue = <string>row[columnName];
        }
    }

    function onKeyDown(e: KeyboardEvent): void {
        if (wasSavePressed(e) || wasEnterPressed(e)) {
            e.preventDefault();
            (<HTMLElement>e.target).blur();
        }
    }

    async function syncOnBlur(): Promise<void> {
        const newValue = boundValue;
        const oldValue = currentValue;
        if (oldValue === newValue) return;

        // Update column
        const newRow = <Row>{ ...get(rowView) };
        newRow[columnName] = newValue;
        await isLoading.wrapPromise(db.updateRow(rowView.tableId, newRow));

        // Register undo/redo
        undoManager.register(
            new Undoable(
                `${undoText} change`,
                isLoading.wrapFunction(async () => {
                    newRow[columnName] = oldValue;
                    await db.updateRow(rowView.tableId, newRow);
                }),
                isLoading.wrapFunction(async () => {
                    newRow[columnName] = newValue;
                    await db.updateRow(rowView.tableId, newRow);
                }),
            ),
        );
    }

    function onClick(e: Event): void {
        if (!stopDefault) return;
        e.preventDefault();
        // e.stopImmediatePropagation();
    }
</script>

<TextAreaCustom
    {...$$restProps}
    {labelText}
    style="{disableBorder ? 'border: none;' : ''} resize: {resizable ? 'vertical' : 'none'};"
    disabled={$isLoading || !rowView || disabled}
    {placeholder}
    bind:value={boundValue}
    on:blur={syncOnBlur}
    on:keydown={onKeyDown}
    on:click={onClick}
    showCount={true}
/>
