/**
 * Module initialization
 */
// API
import '@lib/api/db/db';
import '@lib/api/system/window';

// Store
import '@lib/stores/app/darkmode';
import '@lib/stores/app/maximized';

// Utility
import '@lib/utility/keybinding';
import '@lib/utility/undo-manager';

// Main app
import 'carbon-components-svelte/css/all.css';
// import 'golden-layout/dist/css/goldenlayout-base.css';
// import 'golden-layout/dist/css/themes/goldenlayout-dark-theme.css';
import '@lib/css/golden-layout-base-custom.css';
import '@lib/css/golden-layout-theme-custom.css';
// import '@lib/vendor/golden-layout/css/goldenlayout-base.css';
// import '@lib/vendor/golden-layout/css/themes/goldenlayout-dark-theme.css';
import App from './lib/components/app/App.svelte';

/**
 * Hajime!
 */
export const app = new App({
    target: <Element>document.body,
});
