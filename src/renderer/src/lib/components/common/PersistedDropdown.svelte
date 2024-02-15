<script lang="ts">
    import { Undoable, undoManager } from '@lib/utility/undo-manager';
    import { Dropdown } from 'carbon-components-svelte';
    import type { Writable } from 'svelte/store';
    import { type DropdownItem } from 'carbon-components-svelte/src/Dropdown/Dropdown.svelte';
    import { onDestroy } from 'svelte';

    export let store: Writable<unknown>;
    export let undoText: string;
    export let isDisabled: boolean = false;
    export let dropdownItems: DropdownItem[];

    let boundValue: unknown = $store;
    let currentValue: unknown = $store;

    let locationInPageFinder: HTMLElement;
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

    function onSelect(): void {
        const newValue: unknown = boundValue;
        const oldValue: unknown = currentValue;
        if (oldValue === newValue) return;

        // Update column
        $store = newValue;

        // Register undo/redo
        undoManager.register(
            new Undoable(
                `${undoText} changed`,
                async () => {
                    $store = oldValue;
                },
                async () => {
                    $store = newValue;
                },
            ),
        );
    }

    onDestroy(
        store.subscribe((value: unknown) => {
            if (value !== currentValue) {
                boundValue = value;
                currentValue = value;
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
        disabled={isDisabled}
        {direction}
        on:select={onSelect}
    />
</div>
