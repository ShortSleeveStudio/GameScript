<script lang="ts">
	import {
		GoldenLayout,
		type ComponentContainer,
		ResolvedComponentItemConfig,
		type LogicalZIndex,
		JsonValue,
		LayoutConfig,
		ItemType,
	} from 'golden-layout';
	import Settings from '@lib/components/settings/Settings.svelte';
	import { onMount } from 'svelte';

	// Valid component types
	const ValidComponents: JsonValue[] = ['settings', 'actors'] as const;

	const minSizeDockable: string = `${8 * 30}px`;

	const boundComponentMap = new Map<ComponentContainer, HTMLElement>();
	let goldenLayout: GoldenLayout;
	let mainContainerBoundingClientRect: DOMRect;
	let mainContainer: HTMLElement;
	let hidden: HTMLElement;
	let settings: HTMLElement;
	let actors: HTMLElement;

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
			settings: {
				showPopoutIcon: false,
			},
			root: {
				type: ItemType.row,
				content: [
					{
						minSize: minSizeDockable,
						title: 'Settings',
						header: {
							show: 'top',
							popout: false,
						},
						type: 'component',
						componentType: ValidComponents[0], // settings
					},
					{
						minSize: minSizeDockable,
						title: 'Actors',
						header: {
							show: 'top',
							popout: false,
						},
						type: 'component',
						componentType: ValidComponents[1], // actors
					},
				],
			},
		};
		goldenLayout.loadLayout(test);
	});
</script>

<main bind:this={mainContainer}></main>
<del bind:this={hidden}>
	<dockable bind:this={actors}>Actors</dockable>
	<dockable bind:this={settings}>Settings</dockable>
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
