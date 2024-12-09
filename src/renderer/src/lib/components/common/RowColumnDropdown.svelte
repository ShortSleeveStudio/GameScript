<script lang="ts">
    import { db } from '@lib/api/db/db';
    import { IsLoadingStore } from '@lib/stores/utility/is-loading-store';
    import { type Row } from '@common/common-schema';
    import type { IDbRowView } from '@lib/api/db/db-view-row-interface';
    import { Undoable, undoManager } from '@lib/utility/undo-manager';
    import { Dropdown } from 'carbon-components-svelte';
    import { type DropdownItem } from 'carbon-components-svelte/src/Dropdown/Dropdown.svelte';
    import { onDestroy } from 'svelte';
    import { get } from 'svelte/store';

    export let rowView: IDbRowView<Row>;
    export let columnName: string;
    export let undoText: string;
    export let isDisabled: boolean = false;
    export let dropdownItems: DropdownItem[];
    let locationInPageFinder: HTMLElement;

    const isLoading: IsLoadingStore = new IsLoadingStore();
    let boundValue: number = <number>$rowView[columnName];
    let currentValue: number = <number>$rowView[columnName];
    let direction: 'bottom' | 'top' = 'top';

    function recalculateOpenDirection(): void {
        const domRect: DOMRect = locationInPageFinder.getBoundingClientRect();
        let distanceToTop = domRect.top;
        let distanceToBottom = window.innerHeight - domRect.bottom;
        if (distanceToBottom >= distanceToTop) {
            direction = 'bottom';
        } else {
            direction = 'top';
        }
    }

    async function onSelect(): Promise<void> {
        const newValue: number = boundValue;
        const oldValue: number = currentValue;
        if (oldValue === newValue) return;

        // Update column
        const newRow = <Row>{ ...get(rowView) };
        newRow[columnName] = newValue;
        await isLoading.wrapPromise(db.updateRow(rowView.tableType, newRow));

        undoManager.register(
            new Undoable(
                `${undoText} changed`,
                isLoading.wrapFunction(async () => {
                    newRow[columnName] = oldValue;
                    await db.updateRow(rowView.tableType, newRow);
                }),
                isLoading.wrapFunction(async () => {
                    newRow[columnName] = newValue;
                    await db.updateRow(rowView.tableType, newRow);
                }),
            ),
        );
    }

    onDestroy(
        rowView.subscribe((row: Row) => {
            if (row[columnName] !== currentValue) {
                boundValue = <number>row[columnName];
                currentValue = <number>row[columnName];
            }
        }),
    );
</script>

<!-- svelte-ignore a11y-no-static-element-interactions -->
<div on:mouseenter={recalculateOpenDirection} bind:this={locationInPageFinder}>
    <Dropdown
        size="sm"
        items={dropdownItems}
        bind:selectedId={boundValue}
        disabled={isDisabled || $isLoading}
        {direction}
        on:select={onSelect}
    />
</div>
