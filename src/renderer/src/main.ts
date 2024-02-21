/**
 * Module initialization
 */
// CSS
import '@ag-grid-community/styles/ag-grid.css';
import '@ag-grid-community/styles/ag-theme-quartz.css';
import '@lib/css/carbon.css'; // This needs to be updated everytime you upgrade the library
import '@lib/css/golden-layout-base-custom.css';
import '@lib/css/golden-layout-theme-custom.css';
import '@xyflow/svelte/dist/style.css';

import '@lib/css/main.css';

// API
import '@lib/api/db/db';

// Monaco
import '@lib/monaco/monaco';

// Store
import '@lib/stores/app/darkmode';
import '@lib/stores/app/maximized';

// Utility
import '@lib/utility/keybinding';
import '@lib/utility/undo-manager';

// Grid
import '@lib/grid/grid-initialization';

// Graph
import '@lib/vendor/elkjs/elk-api.js';

// Main app
import App from './lib/components/app/App.svelte';

/**
 * Hajime!
 */
export const app = new App({
    target: <Element>document.body,
});
