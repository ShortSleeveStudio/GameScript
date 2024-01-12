<script lang="ts">
    import { onMount } from 'svelte';
    import {
        EVENT_RESET_LAYOUT,
        EVENT_SELECTION_REQUEST,
        EVENT_SHUTDOWN,
        isCustomEvent,
        type SelectionRequest,
    } from '@lib/constants/events';
    import type { ComponentContainer } from '@lib/vendor/golden-layout/ts/container/component-container';
    import { GoldenLayout } from '@lib/vendor/golden-layout/ts/golden-layout';
    import {
        ResolvedComponentItemConfig,
        ResolvedLayoutConfig,
    } from '@lib/vendor/golden-layout/ts/config/resolved-config';
    import { LayoutConfig } from '@lib/vendor/golden-layout/ts/config/config';
    import {
        ACTORS_LAYOUT,
        BUILD_LAYOUT,
        CONVERSATION_EDITOR_LAYOUT,
        CONVERSATION_FINDER_LAYOUT,
        DEFAULT_LAYOUT,
        INSPECTOR_LAYOUT,
        LAYOUT_ID_ACTORS,
        LAYOUT_ID_BUILD,
        LAYOUT_ID_CONVERSATION_EDITOR,
        LAYOUT_ID_CONVERSATION_FINDER,
        LAYOUT_ID_INSPECTOR,
        LAYOUT_ID_LOCALES,
        LAYOUT_ID_LOCALIZATION_EDITOR,
        LAYOUT_ID_LOCALIZATION_FINDER,
        LAYOUT_ID_SEARCH,
        LAYOUT_ID_SETTINGS,
        LOCALES_LAYOUT,
        LOCALIZATION_EDITOR_LAYOUT,
        LOCALIZATION_FINDER_LAYOUT,
        SEARCH_LAYOUT,
        SETTINGS_LAYOUT,
    } from '../../constants/default-layout';
    import { LS_KEY_LAYOUT } from '@lib/constants/local-storage';
    import { ToastItem, toastManager } from '@lib/stores/app/toasts';
    import {
        actorsIsVisible,
        buildIsVisible,
        conversationEditorIsVisible,
        conversationFinderIsVisible,
        inspectorIsVisible,
        localesIsVisible,
        localizationEditorIsVisible,
        localizationFinderIsVisible,
        searchIsVisible,
        settingsIsVisible,
    } from '@lib/stores/app/layout';
    import { writable, type Readable, type Writable } from 'svelte/store';
    import Dockable, { findDockable, type DockableInfo } from './Dockable.svelte';
    import Settings from '../settings/Settings.svelte';
    import Search from '../search/Search.svelte';
    import LocalizationFinder from '../localization-finder/LocalizationFinder.svelte';
    import LocalizationEditor from '../localization-editor/LocalizationEditor.svelte';
    import Locales from '../locales/Locales.svelte';
    import ConversationFinder from '../conversation-finder/ConversationFinder.svelte';
    import ConversationEditor from '../conversation-editor/ConversationEditor.svelte';
    import Build from '../build/Build.svelte';
    import Actors from '../actors/Actors.svelte';
    import Inspector from '../inspector/Inspector.svelte';

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

    function unbindComponentEventListener(container: ComponentContainer) {
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
        const previousLayoutJson = localStorage.getItem(LS_KEY_LAYOUT);
        if (previousLayoutJson) {
            try {
                const previousLayout: ResolvedLayoutConfig = JSON.parse(previousLayoutJson);
                config = LayoutConfig.fromResolved(previousLayout);
            } catch (e: unknown) {
                let message: string = '';
                if (e instanceof Error) {
                    message = e.message;
                }
                toastManager.showToast(
                    new ToastItem('warning', 'Failed to load previous layout', message),
                );
            }
        }
        return config;
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

        // Event listeners
        addEventListener(EVENT_SHUTDOWN, (e: Event) => {
            localStorage.setItem(LS_KEY_LAYOUT, JSON.stringify(goldenLayout.saveLayout()));
        });
        addEventListener(EVENT_RESET_LAYOUT, (e: Event) => {
            goldenLayout.loadLayout(DEFAULT_LAYOUT);
        });
        addEventListener(EVENT_SELECTION_REQUEST, (e: Event) => {
            if (!isCustomEvent(e)) throw new Error('Selection request was missing payload');
            const selectionRequest = e as CustomEvent<SelectionRequest>;
            const layoutId = selectionRequest.detail.layoutId;
            const info: DockableInfo = findDockable(layoutId);
            info.currentContainer?.focus();
        });
    });
</script>

<main id="dock" bind:this={dock}></main>
<del id="hidden" bind:this={hidden}>
    <Dockable
        name={LAYOUT_ID_ACTORS}
        isVisible={actorsIsVisible}
        layout={layoutReadable}
        layoutConfig={ACTORS_LAYOUT}><Actors /></Dockable
    >
    <Dockable
        name={LAYOUT_ID_BUILD}
        isVisible={buildIsVisible}
        layout={layoutReadable}
        layoutConfig={BUILD_LAYOUT}><Build /></Dockable
    >
    <Dockable
        name={LAYOUT_ID_CONVERSATION_EDITOR}
        isVisible={conversationEditorIsVisible}
        layout={layoutReadable}
        layoutConfig={CONVERSATION_EDITOR_LAYOUT}><ConversationEditor /></Dockable
    >
    <Dockable
        name={LAYOUT_ID_CONVERSATION_FINDER}
        isVisible={conversationFinderIsVisible}
        layout={layoutReadable}
        layoutConfig={CONVERSATION_FINDER_LAYOUT}><ConversationFinder /></Dockable
    >
    <Dockable
        name={LAYOUT_ID_INSPECTOR}
        isVisible={inspectorIsVisible}
        layout={layoutReadable}
        layoutConfig={INSPECTOR_LAYOUT}><Inspector /></Dockable
    >
    <Dockable
        name={LAYOUT_ID_LOCALES}
        isVisible={localesIsVisible}
        layout={layoutReadable}
        layoutConfig={LOCALES_LAYOUT}><Locales /></Dockable
    >
    <Dockable
        name={LAYOUT_ID_LOCALIZATION_EDITOR}
        isVisible={localizationEditorIsVisible}
        layout={layoutReadable}
        layoutConfig={LOCALIZATION_EDITOR_LAYOUT}><LocalizationEditor /></Dockable
    >
    <Dockable
        name={LAYOUT_ID_LOCALIZATION_FINDER}
        isVisible={localizationFinderIsVisible}
        layout={layoutReadable}
        layoutConfig={LOCALIZATION_FINDER_LAYOUT}><LocalizationFinder /></Dockable
    >
    <Dockable
        name={LAYOUT_ID_SEARCH}
        isVisible={searchIsVisible}
        layout={layoutReadable}
        layoutConfig={SEARCH_LAYOUT}><Search /></Dockable
    >
    <Dockable
        name={LAYOUT_ID_SETTINGS}
        isVisible={settingsIsVisible}
        layout={layoutReadable}
        layoutConfig={SETTINGS_LAYOUT}><Settings /></Dockable
    >
</del>

<style>
    main {
        /* TODO: https://github.com/carbon-design-system/carbon-components-svelte/issues/1629 */
        top: var(--cds-spacing-09);
        position: fixed;
        width: 100%;
        height: calc(100% - var(--cds-spacing-09));
    }

    del {
        display: none;
    }
</style>
