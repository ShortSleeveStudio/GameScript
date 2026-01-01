import type {
    ComponentItemConfig,
    HeaderedItemConfig,
    LayoutConfig,
    RootItemConfig,
} from '$lib/vendor/golden-layout/ts/config/config';
import { ItemType } from '$lib/vendor/golden-layout/ts/utils/types';

// Header Config
const HEADER_CONFIG: HeaderedItemConfig.Header = {
    maximise: false,
    popout: false,
};

// Component IDs
// Note: Inspector is no longer in Golden Layout - it's a fixed panel outside the dock
export const LAYOUT_ID_CONVERSATION_EDITOR: string = 'conversation-editor';
export const LAYOUT_ID_CONVERSATION_FINDER: string = 'conversation-finder';
export const LAYOUT_ID_LOCALIZATION_EDITOR: string = 'localization-editor';
export const LAYOUT_ID_ACTOR_MANAGER: string = 'actor-manager';
export const LAYOUT_ID_LOCALE_MANAGER: string = 'locale-manager';

export const LAYOUT_IDS = [
    LAYOUT_ID_CONVERSATION_EDITOR,
    LAYOUT_ID_CONVERSATION_FINDER,
    LAYOUT_ID_LOCALIZATION_EDITOR,
    LAYOUT_ID_ACTOR_MANAGER,
    LAYOUT_ID_LOCALE_MANAGER,
] as const;
export type LayoutId = (typeof LAYOUT_IDS)[number];

// Component Config
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
export const LOCALIZATION_EDITOR_LAYOUT: ComponentItemConfig = {
    id: LAYOUT_ID_LOCALIZATION_EDITOR,
    title: 'Localization Editor',
    header: HEADER_CONFIG,
    type: 'component',
    componentType: 'localization-editor',
};
export const ACTOR_MANAGER_LAYOUT: ComponentItemConfig = {
    id: LAYOUT_ID_ACTOR_MANAGER,
    title: 'Actor Manager',
    header: HEADER_CONFIG,
    type: 'component',
    componentType: 'actor-manager',
};
export const LOCALE_MANAGER_LAYOUT: ComponentItemConfig = {
    id: LAYOUT_ID_LOCALE_MANAGER,
    title: 'Locale Manager',
    header: HEADER_CONFIG,
    type: 'component',
    componentType: 'locale-manager',
};

// Default layout: Inspector is now fixed outside Golden Layout, so we have two columns
const ROOT: RootItemConfig = {
    type: ItemType.row,
    content: [
        {
            size: '30%',
            type: 'stack',
            content: [CONVERSATION_FINDER_LAYOUT, ACTOR_MANAGER_LAYOUT, LOCALE_MANAGER_LAYOUT],
        },
        {
            size: '70%',
            type: 'stack',
            content: [CONVERSATION_EDITOR_LAYOUT, LOCALIZATION_EDITOR_LAYOUT],
        },
    ],
};

// Get tab height from CSS variable or use default
function getTabHeight(): number {
    if (typeof document !== 'undefined') {
        const value = getComputedStyle(document.documentElement).getPropertyValue('--gl-tab-height');
        if (value) {
            return parseInt(value);
        }
    }
    return 24; // Default
}

const DIMENSIONS: LayoutConfig.Dimensions = {
    defaultMinItemWidth: `${8 * 24}px`,
    defaultMinItemHeight: `${8 * 24}px`,
    borderWidth: 2,
    headerHeight: getTabHeight(),
};

/**
 * Default root layout
 */
export const DEFAULT_LAYOUT: LayoutConfig = {
    dimensions: DIMENSIONS,
    root: ROOT,
};
