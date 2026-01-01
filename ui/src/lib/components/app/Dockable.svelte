<script lang="ts" module>
    import type { Writable } from 'svelte/store';
    import type { ComponentContainer } from '$lib/vendor/golden-layout/ts/container/component-container';

    export interface DockableInfo {
        element: HTMLElement;
        isVisible: Writable<boolean>;
        // This will be set ONLY when the dockable is in the dock container, not just when the store
        // is requesting that the dockable be visible. It's sort of a hack to get around the fact
        // that loading layouts circumvents using the store to elicit change.
        actuallyInDock: boolean;
        currentContainer: ComponentContainer | undefined;
    }

    // Component name to component map
    const dockableNameToDockable = new Map<string, DockableInfo>();

    // Find a dockable by name, throws error if it doesn't exist
    export function findDockable(name: string): DockableInfo {
        const dockable: DockableInfo | undefined = dockableNameToDockable.get(name);
        if (!dockable) {
            throw new Error(`Invalid component type ${name}`);
        }
        return dockable;
    }
</script>

<script lang="ts">
    import type { ComponentItemConfig } from '$lib/vendor/golden-layout/ts/config/config';

    import type { GoldenLayout } from '$lib/vendor/golden-layout/ts/golden-layout';
    import { LayoutManager } from '$lib/vendor/golden-layout/ts/layout-manager';

    import type { Snippet } from 'svelte';
    import { onDestroy, onMount } from 'svelte';
    import { get, type Readable, type Unsubscriber } from 'svelte/store';

    interface Props {
        name: string;
        layout: Readable<GoldenLayout>;
        isVisible: Writable<boolean>;
        layoutConfig: ComponentItemConfig;
        children?: Snippet;
    }

    let {
        name,
        layout,
        isVisible,
        layoutConfig,
        children,
    }: Props = $props();

    // Bindings
    let element: HTMLElement | undefined = $state();

    // Vars
    let unsubscriber: Unsubscriber;
    let dockableInfo: DockableInfo;

    onMount(() => {
        // Construct DockableInfo
        dockableInfo = {
            element: element!,
            isVisible: isVisible,
            actuallyInDock: false,
            currentContainer: undefined,
        };

        // Store self in dockable registry
        dockableNameToDockable.set(name, dockableInfo);

        // Listen to is visible store
        unsubscriber = isVisible.subscribe((newVal: boolean) => {
            // If the component is already in accordance with requested visibility, return
            if (dockableInfo.actuallyInDock === newVal) return;

            // We need to update the layout
            if (newVal) {
                get<GoldenLayout>(layout)?.addItemAtLocation(
                    layoutConfig,
                    LayoutManager.defaultLocationSelectors,
                );
            } else {
                dockableInfo.currentContainer?.close();
            }
        });
    });
    onDestroy(() => {
        // Remove self from dockable registry
        dockableNameToDockable.delete(name);

        // Unsubscribe from store
        unsubscriber();
    });
</script>

<dockable class="dockable" bind:this={element}>{#if children}{@render children()}{/if}</dockable>

<style>
    .dockable {
        display: flex;
        width: 100%;
        height: 100%;
    }
</style>
