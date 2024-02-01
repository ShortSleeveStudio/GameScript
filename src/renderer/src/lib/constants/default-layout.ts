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

// Component IDs
export const LAYOUT_ID_ACTORS: string = 'actors';
export const LAYOUT_ID_BUILD: string = 'build';
export const LAYOUT_ID_CONVERSATION_EDITOR: string = 'conversation-editor';
export const LAYOUT_ID_CONVERSATION_FINDER: string = 'conversation-finder';
export const LAYOUT_ID_INSPECTOR: string = 'inspector';
export const LAYOUT_ID_LOCALIZATION_EDITOR: string = 'localization-editor';
export const LAYOUT_ID_SEARCH: string = 'search';
export const LAYOUT_ID_SETTINGS: string = 'settings';
export const LAYOUT_IDS = [
    LAYOUT_ID_ACTORS,
    LAYOUT_ID_BUILD,
    LAYOUT_ID_CONVERSATION_EDITOR,
    LAYOUT_ID_CONVERSATION_FINDER,
    LAYOUT_ID_INSPECTOR,
    LAYOUT_ID_LOCALIZATION_EDITOR,
    LAYOUT_ID_SEARCH,
    LAYOUT_ID_SETTINGS,
] as const;
export type LayoutId = (typeof LAYOUT_IDS)[number];

// Component Config
export const ACTORS_LAYOUT: ComponentItemConfig = {
    id: LAYOUT_ID_ACTORS,
    title: 'Actors',
    header: HEADER_CONFIG,
    type: 'component',
    componentType: 'actors',
};
export const BUILD_LAYOUT: ComponentItemConfig = {
    id: LAYOUT_ID_BUILD,
    title: 'Build',
    header: HEADER_CONFIG,
    type: 'component',
    componentType: 'build',
};
export const CONVERSATION_EDITOR_LAYOUT: ComponentItemConfig = {
    id: LAYOUT_ID_CONVERSATION_EDITOR,
    title: 'Conversation Editor',
    header: HEADER_CONFIG,
    type: 'component',
    componentType: 'conversation-editor',
};
export const CONVERSATION_FINDER_LAYOUT: ComponentItemConfig = {
    id: LAYOUT_ID_CONVERSATION_FINDER,
    title: 'Conversation Finder',
    header: HEADER_CONFIG,
    type: 'component',
    componentType: 'conversation-finder',
};
export const INSPECTOR_LAYOUT: ComponentItemConfig = {
    id: LAYOUT_ID_INSPECTOR,
    title: 'Inspector',
    header: HEADER_CONFIG,
    type: 'component',
    componentType: 'inspector',
};
export const LOCALIZATION_EDITOR_LAYOUT: ComponentItemConfig = {
    id: LAYOUT_ID_LOCALIZATION_EDITOR,
    title: 'Localization Editor',
    header: HEADER_CONFIG,
    type: 'component',
    componentType: 'localization-editor',
};
export const SEARCH_LAYOUT: ComponentItemConfig = {
    id: LAYOUT_ID_SEARCH,
    title: 'Search',
    header: HEADER_CONFIG,
    type: 'component',
    componentType: 'search',
};
export const SETTINGS_LAYOUT: ComponentItemConfig = {
    id: LAYOUT_ID_SETTINGS,
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
            content: [CONVERSATION_FINDER_LAYOUT, ACTORS_LAYOUT],
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
