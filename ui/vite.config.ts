import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [sveltekit()],
  build: {
    // Ensure assets work in webview context
    assetsInlineLimit: 0,
  },
  // For webview compatibility
  base: './',
});
