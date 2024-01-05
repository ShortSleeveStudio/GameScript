<script lang="ts">
    import { FIELD_TYPE_DROP_DOWN_ITEMS, type DefaultField } from '@lib/api/db/db-schema';
    import type { IDbRowView } from '@lib/api/db/db-view-row-interface';
    import { isApplyingDefaultFields } from '@lib/stores/app/applying-default-fields';
    import { Undoable, undoManager } from '@lib/utility/undo-manager';
    import { Dropdown } from 'carbon-components-svelte';
    import { onDestroy } from 'svelte';
    import type { Readable } from 'svelte/store';

    export let rowView: IDbRowView<DefaultField>;
    let locationInPageFinder: HTMLElement;

    // TODO: https://svelte-5-preview.vercel.app/status
    const isLoading: Readable<boolean> = rowView.isColumnLoading('type');
    let boundValue: number = $rowView.type;
    let currentValue: number = $rowView.type;
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
        const newValue = boundValue;
        const oldValue = currentValue;
        if (oldValue === newValue) return;

        await rowView.updateColumn('type', newValue);
        undoManager.register(
            new Undoable(
                'Set default field type',
                async () => {
                    await rowView.updateColumn('type', oldValue);
                },
                async () => {
                    await rowView.updateColumn('type', newValue);
                },
            ),
        );
    }

    onDestroy(
        rowView.subscribe((row: DefaultField) => {
            if (row.type !== currentValue) {
                boundValue = row.type;
                currentValue = row.type;
            }
        }),
    );
</script>

<!-- svelte-ignore a11y-no-static-element-interactions -->
<div on:mouseenter={recalculateOpenDirection} bind:this={locationInPageFinder}>
    <Dropdown
        size="sm"
        items={FIELD_TYPE_DROP_DOWN_ITEMS}
        bind:selectedId={boundValue}
        disabled={$isApplyingDefaultFields || $isLoading}
        {direction}
        on:select={onSelect}
    />
</div>
