<script lang="ts">
    import { onDestroy, onMount } from 'svelte';
    import type { ComponentContainer } from '$lib/vendor/golden-layout/ts/container/component-container';
    import { GoldenLayout } from '$lib/vendor/golden-layout/ts/golden-layout';
    import {
        ResolvedComponentItemConfig,
        ResolvedLayoutConfig,
    } from '$lib/vendor/golden-layout/ts/config/resolved-config';
    import { LayoutConfig } from '$lib/vendor/golden-layout/ts/config/config';
    import {
        ACTOR_MANAGER_LAYOUT,
        CONVERSATION_EDITOR_LAYOUT,
        CONVERSATION_FINDER_LAYOUT,
        DEFAULT_LAYOUT,
        LAYOUT_ID_ACTOR_MANAGER,
        LAYOUT_ID_CONVERSATION_EDITOR,
        LAYOUT_ID_CONVERSATION_FINDER,
        LAYOUT_ID_LOCALE_MANAGER,
        LAYOUT_ID_LOCALIZATION_EDITOR,
        LOCALE_MANAGER_LAYOUT,
        LOCALIZATION_EDITOR_LAYOUT,
    } from '$lib/constants/default-layout';
    import { LS_KEY_DOCK_LAYOUT } from '$lib/constants/local-storage';
    import {
        EVENT_DOCK_SELECTION_REQUEST,
        EVENT_DOCK_SELECTION_CHANGED,
        type DockSelectionRequest,
        type DockSelectionChanged,
    } from '$lib/constants/events';
    import { toastError } from '$lib/stores/notifications';
    import {
        actorManagerIsVisible,
        conversationEditorIsVisible,
        conversationFinderIsVisible,
        localeManagerIsVisible,
        localizationEditorIsVisible,
    } from '$lib/stores/layout';
    import { writable, type Readable, type Writable } from 'svelte/store';
    import Dockable, { findDockable, type DockableInfo } from './Dockable.svelte';

    // Panel components
    // Note: Inspector is now a fixed panel outside Golden Layout (in InspectorPanel.svelte)
    import LocalizationEditor from '$lib/components/panels/LocalizationEditor.svelte';
    import ConversationFinder from '$lib/components/panels/ConversationFinder.svelte';
    import ActorManager from '$lib/components/panels/ActorManager.svelte';
    import LocaleManager from '$lib/components/panels/LocaleManager.svelte';
    import Graph from '$lib/components/graph/Graph.svelte';
    import { SvelteFlowProvider } from '@xyflow/svelte';

    // Containers
    let dock: HTMLElement;
    let hidden: HTMLElement;

    // Layout
    const layoutWritable: Writable<GoldenLayout> = writable<GoldenLayout>();
    const layoutReadable: Readable<GoldenLayout> = { subscribe: layoutWritable.subscribe };

    function bindComponentEventListener(
        container: ComponentContainer,
        itemConfig: ResolvedComponentItemConfig,
    ): ComponentContainer.BindableComponent {
        // Use ResolvedComponentItemConfig.resolveComponentTypeName to resolve component types to a
        // unique name
        const componentTypeName = ResolvedComponentItemConfig.resolveComponentTypeName(itemConfig);
        if (componentTypeName === undefined) {
            throw new Error('handleBindComponentEvent: Undefined componentTypeName');
        }

        // Find component type
        const dockable: DockableInfo = findDockable(componentTypeName);

        // "Add" the component
        container.element.appendChild(dockable.element);

        // Set component visible store
        dockable.actuallyInDock = true;
        dockable.currentContainer = container;
        dockable.isVisible.set(true);

        // Return the new component
        return {
            component: dockable,
            virtual: true,
        };
    }

    function unbindComponentEventListener(container: ComponentContainer): void {
        // Grab the component
        const dockable: DockableInfo = container.component as DockableInfo;

        // "Remove" the component
        hidden.appendChild(dockable.element);

        // Set component visible store
        dockable.actuallyInDock = false;
        dockable.currentContainer = undefined;
        dockable.isVisible.set(false);
    }

    function loadLayoutConfig(): LayoutConfig {
        let config: LayoutConfig = DEFAULT_LAYOUT;
        const previousLayoutJson = localStorage.getItem(LS_KEY_DOCK_LAYOUT);
        if (previousLayoutJson) {
            try {
                const previousLayout: ResolvedLayoutConfig = JSON.parse(previousLayoutJson);
                config = LayoutConfig.fromResolved(previousLayout);
            } catch (e: unknown) {
                let message: string = '';
                if (e instanceof Error) {
                    message = e.message;
                }
                toastError('Failed to load previous layout', message);
            }
        }
        return config;
    }

    function saveLayout(): void {
        const layout = layoutWritable;
        if (layout) {
            const goldenLayout = layoutReadable;
            if (goldenLayout) {
                import('svelte/store').then(({ get }) => {
                    const gl = get(goldenLayout);
                    if (gl) {
                        localStorage.setItem(LS_KEY_DOCK_LAYOUT, JSON.stringify(gl.saveLayout()));
                    }
                });
            }
        }
    }

    function onDockSelectionRequest(event: Event): void {
        const customEvent = event as CustomEvent<DockSelectionRequest>;
        const layoutId = customEvent.detail.layoutId;

        // Find and focus the component
        const dockable = findDockable(layoutId);
        if (dockable && dockable.currentContainer) {
            // Focus the component's tab/stack via parent (ComponentItem)
            const componentItem = dockable.currentContainer.parent;
            if (componentItem) {
                componentItem.focus();
            }
        }

        // Dispatch selection changed event
        dispatchEvent(
            new CustomEvent(EVENT_DOCK_SELECTION_CHANGED, {
                detail: { layoutId } as DockSelectionChanged,
            }),
        );
    }

    // Create the layout
    onMount(() => {
        // Initialize Golden Layout
        const goldenLayout: GoldenLayout = new GoldenLayout(
            dock,
            bindComponentEventListener,
            unbindComponentEventListener,
        );
        goldenLayout.resizeWithContainerAutomatically = true;

        // Set layout store
        layoutWritable.set(goldenLayout);

        // Load previous layout if possible, otherwise load default
        goldenLayout.loadLayout(loadLayoutConfig());

        // Save layout on window unload
        window.addEventListener('beforeunload', saveLayout);

        // Listen for dock selection requests
        window.addEventListener(EVENT_DOCK_SELECTION_REQUEST, onDockSelectionRequest);
    });

    onDestroy(() => {
        saveLayout();
        window.removeEventListener('beforeunload', saveLayout);
        window.removeEventListener(EVENT_DOCK_SELECTION_REQUEST, onDockSelectionRequest);
    });

    /** Reset layout to default */
    export function resetLayout(): void {
        import('svelte/store').then(({ get }) => {
            const gl = get(layoutReadable);
            if (gl) {
                gl.loadLayout(DEFAULT_LAYOUT);
            }
        });
    }
</script>

<main id="dock" bind:this={dock}></main>
<del id="hidden" bind:this={hidden}>
    <Dockable
        name={LAYOUT_ID_CONVERSATION_EDITOR}
        isVisible={conversationEditorIsVisible}
        layout={layoutReadable}
        layoutConfig={CONVERSATION_EDITOR_LAYOUT}><SvelteFlowProvider><Graph /></SvelteFlowProvider></Dockable
    >
    <Dockable
        name={LAYOUT_ID_CONVERSATION_FINDER}
        isVisible={conversationFinderIsVisible}
        layout={layoutReadable}
        layoutConfig={CONVERSATION_FINDER_LAYOUT}><ConversationFinder /></Dockable
    >
    <Dockable
        name={LAYOUT_ID_LOCALIZATION_EDITOR}
        isVisible={localizationEditorIsVisible}
        layout={layoutReadable}
        layoutConfig={LOCALIZATION_EDITOR_LAYOUT}><LocalizationEditor /></Dockable
    >
    <Dockable
        name={LAYOUT_ID_ACTOR_MANAGER}
        isVisible={actorManagerIsVisible}
        layout={layoutReadable}
        layoutConfig={ACTOR_MANAGER_LAYOUT}><ActorManager /></Dockable
    >
    <Dockable
        name={LAYOUT_ID_LOCALE_MANAGER}
        isVisible={localeManagerIsVisible}
        layout={layoutReadable}
        layoutConfig={LOCALE_MANAGER_LAYOUT}><LocaleManager /></Dockable
    >
</del>

<style>
    main {
        position: relative;
        width: 100%;
        height: 100%;
    }

    del {
        display: none;
    }
</style>
