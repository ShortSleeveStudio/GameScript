<script lang="ts" generics="RowType extends Row">
    import { type Row } from '@lib/api/db/db-schema';
    import type { IDbRowView } from '@lib/api/db/db-view-row-interface';
    import { Undoable, undoManager } from '@lib/utility/undo-manager';
    import { Dropdown } from 'carbon-components-svelte';
    import { type DropdownItem } from 'carbon-components-svelte/src/Dropdown/Dropdown.svelte';
    import { onDestroy } from 'svelte';
    import type { Readable } from 'svelte/store';

    export let rowView: IDbRowView<RowType>;
    export let columnName: string;
    export let undoText: string;
    export let isDisabled: boolean;
    export let dropdownItems: DropdownItem[];
    let locationInPageFinder: HTMLElement;

    // TODO: https://svelte-5-preview.vercel.app/status
    const isLoading: Readable<boolean> = rowView.isColumnLoading(columnName);
    let boundValue: number = <number>$rowView[columnName];
    let currentValue: number = <number>$rowView[columnName];
    let direction: 'bottom' | 'top' = 'top';

    function recalculateOpenDirection() {
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

        await rowView.updateColumn(columnName, newValue);
        undoManager.register(
            new Undoable(
                `${undoText} changed`,
                async () => {
                    await rowView.updateColumn(columnName, oldValue);
                },
                async () => {
                    await rowView.updateColumn(columnName, newValue);
                },
            ),
        );
    }

    onDestroy(
        rowView.subscribe((row: RowType) => {
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
