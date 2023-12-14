<script lang="ts">
	// import {
	// 	GoldenLayout,
	// 	type ComponentContainer,
	// 	ResolvedComponentItemConfig,
	// 	type LogicalZIndex,
	// 	JsonValue,
	// 	LayoutConfig,
	// 	ItemType,
	// } from '@lib/vendor/golden-layout';

	// import Settings from '@lib/components/settings/Settings.svelte';
	import { onMount } from 'svelte';
	import { SHUTDOWN } from '@lib/events/events';
	import { Tab, TabContent, Tabs } from 'carbon-components-svelte';
	import type { ComponentContainer } from '@lib/vendor/golden-layout/ts/container/component-container';
	import { GoldenLayout } from '@lib/vendor/golden-layout/ts/golden-layout';
	import { ResolvedComponentItemConfig } from '@lib/vendor/golden-layout/ts/config/resolved-config';
	import {
		ItemType,
		JsonValue,
		type LogicalZIndex,
	} from '@lib/vendor/golden-layout/ts/utils/types';
	import type { LayoutConfig } from '@lib/vendor/golden-layout/ts/config/config';

	// Valid component types
	const ValidComponents: JsonValue[] = [
		'actors',
		'build',
		'conversation-editor',
		'conversation-finder',
		'inspector',
		'locales',
		'localization-editor',
		'localization-finder',
		'search',
		'settings',
	] as const;

	const minSizeDockable: string = `${8 * 30}px`;
	const boundComponentMap = new Map<ComponentContainer, HTMLElement>();

	// Containers
	let goldenLayout: GoldenLayout;
	let mainContainerBoundingClientRect: DOMRect;
	let mainContainer: HTMLElement;
	let hidden: HTMLElement;

	// Components
	let actors: HTMLElement;
	let build: HTMLElement;
	let conversationEditor: HTMLElement;
	let conversationFinder: HTMLElement;
	let inspector: HTMLElement;
	let locales: HTMLElement;
	let localizationEditor: HTMLElement;
	let localizationFinder: HTMLElement;
	let search: HTMLElement;
	let settings: HTMLElement;

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
		let component;
		switch (componentTypeName) {
			case 'actors':
				component = actors;
				break;
			case 'settings':
				component = settings;
				break;
			default:
				throw new Error(`Invalid component type ${componentTypeName}`);
		}

		// "Add" the component
		mainContainer.appendChild(component);

		// Map container to component
		boundComponentMap.set(container, component);

		// Recting required event
		container.virtualZIndexChangeRequiredEvent = handleContainerVirtualZIndexChangeRequiredEvent;
		container.virtualRectingRequiredEvent = handleContainerVirtualRectingRequiredEvent;
		container.virtualVisibilityChangeRequiredEvent =
			handleContainerVirtualVisibilityChangeRequiredEvent;

		// Return the new component
		return {
			component: component,
			virtual: true,
		};
	}

	function handleContainerVirtualZIndexChangeRequiredEvent(
		container: ComponentContainer,
		logicalZIndex: LogicalZIndex,
		defaultZIndex: string,
	) {
		// Grab the component
		const component: HTMLElement = <HTMLElement>boundComponentMap.get(container);
		if (component === undefined) {
			throw new Error('handleContainerVirtualZIndexChangeRequiredEvent: Component not found');
		}

		// Set z-index
		component.style.zIndex = defaultZIndex;
	}

	function handleContainerVirtualRectingRequiredEvent(
		container: ComponentContainer,
		width: number,
		height: number,
	) {
		// Grab the component
		const component: HTMLElement = <HTMLElement>boundComponentMap.get(container);
		if (component === undefined) {
			throw new Error('handleContainerVirtualRectingRequiredEvent: Component not found');
		}

		// Calculate new position
		const containerBoundingClientRect = container.element.getBoundingClientRect();
		const left = containerBoundingClientRect.left - mainContainerBoundingClientRect.left;
		const top = containerBoundingClientRect.top - mainContainerBoundingClientRect.top;

		// Set position
		component.style.left = numberToPixels(left);
		component.style.top = numberToPixels(top);
		component.style.width = numberToPixels(width);
		component.style.height = numberToPixels(height);
	}

	function handleContainerVirtualVisibilityChangeRequiredEvent(
		container: ComponentContainer,
		visible: boolean,
	) {
		// Grab the component
		const component: HTMLElement = <HTMLElement>boundComponentMap.get(container);
		if (component === undefined) {
			throw new Error('handleContainerVisibilityChangeRequiredEvent: Component not found');
		}

		// Set visible or invisible
		if (visible) {
			component.style.display = '';
		} else {
			component.style.display = 'none';
		}
	}

	function numberToPixels(value: number): string {
		return value.toString(10) + 'px';
	}

	function unbindComponentEventListener(container: ComponentContainer) {
		// Grab the component
		const component: HTMLElement = <HTMLElement>boundComponentMap.get(container);
		if (component === undefined) {
			throw new Error('handleUnbindComponentEvent: Component not found');
		}

		// "Remove" the component
		hidden.appendChild(component);
		boundComponentMap.delete(container);
	}

	function handleBeforeVirtualRectingEvent(count: number) {
		mainContainerBoundingClientRect = mainContainer.getBoundingClientRect();
	}

	// Create the layout
	onMount(() => {
		goldenLayout = new GoldenLayout(
			mainContainer,
			bindComponentEventListener,
			unbindComponentEventListener,
		);
		goldenLayout.resizeWithContainerAutomatically = true;
		goldenLayout.beforeVirtualRectingEvent = handleBeforeVirtualRectingEvent;

		const test: LayoutConfig = {
			dimensions: {
				borderWidth: 1,
				headerHeight: 32,
			},
			root: {
				type: ItemType.row,
				content: [
					{
						minSize: minSizeDockable,
						title: 'Settings',
						// isClosable: false,
						header: {
							maximise: false,
							popout: false,
							// show: false,
						},
						type: 'component',
						componentType: ValidComponents[9], // settings
					},
					{
						minSize: minSizeDockable,
						title: 'Actors',
						// isClosable: false,
						header: {
							maximise: false,
							popout: false,
							// show: false,
						},
						type: 'component',
						componentType: ValidComponents[0], // actors
					},
				],
			},
		};
		goldenLayout.loadLayout(test);

		// addEventListener(SHUTDOWN, (e: Event) => {
		// 	console.log(`settings recieved ${e}`);
		// });
	});
</script>

<main bind:this={mainContainer} id="main"></main>
<del bind:this={hidden}>
	<dockable bind:this={actors}>Actors</dockable>
	<dockable bind:this={build}>Build</dockable>
	<dockable bind:this={conversationEditor}>Conversation Editor</dockable>
	<dockable bind:this={conversationFinder}>Conversation Finder</dockable>
	<dockable bind:this={inspector}>Inspector</dockable>
	<dockable bind:this={locales}>Locales</dockable>
	<dockable bind:this={localizationEditor}>Lozalization Editor</dockable>
	<dockable bind:this={localizationFinder}>Lozalization Finder</dockable>
	<dockable bind:this={search}>Search</dockable>
	<dockable bind:this={settings}>
		Settings
		<Tabs type="container">
			<Tab label="actors" />
			<Tab label="build" />
			<Tab label="conversation-editor" />
			<Tab label="conversation-finder" />
			<Tab label="inspector" />
			<Tab label="locales" />
			<Tab label="localization-editor" />
			<Tab label="localization-finder" />
			<Tab label="search" />
			<Tab label="settings" />
			<svelte:fragment slot="content">
				<TabContent>Actors</TabContent>
				<TabContent>Build</TabContent>
				<TabContent>Conversation-editor</TabContent>
				<TabContent>Conversation-finder</TabContent>
				<TabContent>Inspector</TabContent>
				<TabContent>Locales</TabContent>
				<TabContent>Localization-editor</TabContent>
				<TabContent>Localization-finder</TabContent>
				<TabContent>Search</TabContent>
				<TabContent>Settings</TabContent>
			</svelte:fragment>
		</Tabs>
	</dockable>
</del>

<style>
	main {
		/* TODO: https://github.com/carbon-design-system/carbon-components-svelte/issues/1629 */
		top: var(--cds-spacing-09);
		position: fixed;
		width: 100%;
		height: 100%;
	}

	del {
		display: none;
	}

	dockable {
		position: absolute;
	}
</style>
