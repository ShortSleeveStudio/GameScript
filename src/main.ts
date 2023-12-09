/**
 * Module initialization
 */
// API init
import '@lib/api/window';

// Store init
import '@lib/stores/darkmode';
import '@lib/stores/maximized';

// Main app init
import App from './App.svelte';
import './tailwind.css';

// Start application
const app = new App({
	target: <Element>document.body,
});
export default app;
