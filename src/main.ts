/**
 * Module initialization
 */
// API
import '@lib/api/window';

// Store
import '@lib/stores/darkmode';
import '@lib/stores/maximized';

// Main app
import App from './App.svelte';
import './main.css';

/**
 * Hajime!
 */
export const app = new App({
	target: <Element>document.body,
});
