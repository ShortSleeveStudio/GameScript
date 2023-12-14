/**
 * Module initialization
 */
// API
import '@lib/api/window';

// Store
import '@lib/stores/darkmode';
import '@lib/stores/maximized';

// Main app
import 'carbon-components-svelte/css/all.css';
// import 'golden-layout/dist/css/goldenlayout-base.css';
// import 'golden-layout/dist/css/themes/goldenlayout-dark-theme.css';
// import './golden-layout-base-custom.css';
// import './golden-layout-theme-custom.css';
import '@lib/vendor/golden-layout/css/goldenlayout-base.css';
import '@lib/vendor/golden-layout/css/themes/goldenlayout-dark-theme.css';

import App from './App.svelte';

/**
 * Hajime!
 */
export const app = new App({
	target: <Element>document.body,
});
