import type {
	ComponentItemConfig,
	HeaderedItemConfig,
	LayoutConfig,
	RootItemConfig,
} from '@lib/vendor/golden-layout/ts/config/config';
import { ItemType } from '@lib/vendor/golden-layout/ts/utils/types';

// Header Config
const HEADER_CONFIG: HeaderedItemConfig.Header = {
	maximise: false,
	popout: false,
};

// Component Config
export const ACTORS_LAYOUT: ComponentItemConfig = {
	id: 'actors',
	title: 'Actors',
	header: HEADER_CONFIG,
	type: 'component',
	componentType: 'actors',
};
export const BUILD_LAYOUT: ComponentItemConfig = {
	id: 'build',
	title: 'Build',
	header: HEADER_CONFIG,
	type: 'component',
	componentType: 'build',
};
export const CONVERSATION_EDITOR_LAYOUT: ComponentItemConfig = {
	id: 'conversation-editor',
	title: 'Conversation Editor',
	header: HEADER_CONFIG,
	type: 'component',
	componentType: 'conversation-editor',
};
export const CONVERSATION_FINDER_LAYOUT: ComponentItemConfig = {
	id: 'conversation-finder',
	title: 'Conversation Finder',
	header: HEADER_CONFIG,
	type: 'component',
	componentType: 'conversation-finder',
};
export const INSPECTOR_LAYOUT: ComponentItemConfig = {
	id: 'inspector',
	title: 'Inspector',
	header: HEADER_CONFIG,
	type: 'component',
	componentType: 'inspector',
};
export const LOCALES_LAYOUT: ComponentItemConfig = {
	id: 'locales',
	title: 'Locales',
	header: HEADER_CONFIG,
	type: 'component',
	componentType: 'locales',
};
export const LOCALIZATION_EDITOR_LAYOUT: ComponentItemConfig = {
	id: 'localization-editor',
	title: 'Localization Editor',
	header: HEADER_CONFIG,
	type: 'component',
	componentType: 'localization-editor',
};
export const LOCALIZATION_FINDER_LAYOUT: ComponentItemConfig = {
	id: 'localization-finder',
	title: 'Localization Finder',
	header: HEADER_CONFIG,
	type: 'component',
	componentType: 'localization-finder',
};
export const SEARCH_LAYOUT: ComponentItemConfig = {
	id: 'search',
	title: 'Search',
	header: HEADER_CONFIG,
	type: 'component',
	componentType: 'search',
};
export const SETTINGS_LAYOUT: ComponentItemConfig = {
	id: 'settings',
	title: 'Settings',
	header: HEADER_CONFIG,
	type: 'component',
	componentType: 'settings',
};

const ROOT: RootItemConfig = {
	type: ItemType.row,
	content: [
		{
			size: '23%',
			type: 'stack',
			content: [
				CONVERSATION_FINDER_LAYOUT,
				LOCALIZATION_FINDER_LAYOUT,
				ACTORS_LAYOUT,
				LOCALES_LAYOUT,
			],
		},
		{
			size: '50%',
			type: 'stack',
			content: [SETTINGS_LAYOUT, CONVERSATION_EDITOR_LAYOUT, LOCALIZATION_EDITOR_LAYOUT],
		},
		{
			size: '27%',
			type: 'column',
			content: [
				{
					size: '65%',
					type: 'stack',
					content: [INSPECTOR_LAYOUT, BUILD_LAYOUT],
				},
				{
					size: '35%',
					type: 'stack',
					content: [SEARCH_LAYOUT],
				},
			],
		},
	],
};

const DIMENSIONS: LayoutConfig.Dimensions = {
	defaultMinItemWidth: `${8 * 24}px`,
	defaultMinItemHeight: `${8 * 24}px`,
	borderWidth: 1,
	headerHeight: parseInt(
		getComputedStyle(document.documentElement).getPropertyValue('--gl-tab-height'),
	),
};

/**
 * Default root layout
 */
export const DEFAULT_LAYOUT: LayoutConfig = {
	dimensions: DIMENSIONS,
	root: ROOT,
};
