/**
 * Client-side hooks for SvelteKit.
 *
 * In a VSCode webview, the URL is something like:
 * vscode-webview://xxx/index.html
 *
 * We need to tell the router to treat this as the root route.
 */

import type { HandleClientError, Reroute } from '@sveltejs/kit';

// Notifications
import { toastError } from '$lib/stores/notifications.js';


// Reroute all paths to the root - we're a single-page app
export const reroute: Reroute = ({ url }) => {
  // Always route to the root page regardless of the URL path
  return '/';
};

// Handle client errors gracefully
export const handleError: HandleClientError = ({ error, event }) => {
  toastError('Client error:', error);
  return {
    message: 'An error occurred',
  };
};
