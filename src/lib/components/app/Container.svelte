<script lang="ts">
	import { Content } from 'carbon-components-svelte';
	// import {
	// 	GoldenLayout,
	// 	type ComponentContainer,
	// 	ResolvedComponentItemConfig,
	// } from 'golden-layout';

	let contentElement;
	// let goldenLayout = new GoldenLayout(
	// 	contentElement,
	// 	bindComponentEventListener,
	// 	unbindComponentEventListener,
	// );

	// function bindComponentEventListener(
	// 	container: ComponentContainer,
	// 	itemConfig: ResolvedComponentItemConfig,
	// ): ComponentContainer.BindableComponent {
	// 	// Use ResolvedComponentItemConfig.resolveComponentTypeName to resolve component types to a
	// 	// unique name
	// 	const componentTypeName = ResolvedComponentItemConfig.resolveComponentTypeName(itemConfig);
	// 	if (componentTypeName === undefined) {
	// 		throw new Error('handleBindComponentEvent: Undefined componentTypeName');
	// 	}
	// 	const component = null;
	// 	// this.createVirtualComponent(
	// 	// 	container,
	// 	// 	componentTypeName,
	// 	// 	itemConfig.componentState,
	// 	// );
	// 	// const componentRootElement = component.rootHtmlElement;
	// 	// this._layoutElement.appendChild(componentRootElement);
	// 	// this._boundComponentMap.set(container, component);
	// 	// container.virtualRectingRequiredEvent = (container, width, height) =>
	// 	// 	this.handleContainerVirtualRectingRequiredEvent(container, width, height);
	// 	// container.virtualVisibilityChangeRequiredEvent = (container, visible) =>
	// 	// 	this.handleContainerVisibilityChangeRequiredEvent(container, visible);
	// 	return {
	// 		component,
	// 		virtual: true,
	// 	};
	// }

	// function unbindComponentEventListener(container: ComponentContainer) {}
</script>

<main bind:this={contentElement}></main>

<style>
	main {
		top: var(--cds-spacing-09);
		position: fixed;
		width: 100%;
		height: 100%;
	}
</style>
<!-- TODO: https://github.com/carbon-design-system/carbon-components-svelte/issues/1629  -->