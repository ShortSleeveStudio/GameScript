import adapter from '@sveltejs/adapter-static';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';

/** @type {import('@sveltejs/kit').Config} */
const config = {
  preprocess: vitePreprocess(),

  // Disable a11y warnings - this is a desktop-style IDE application, not a public web page
  onwarn: (warning, handler) => {
    if (warning.code.startsWith('a11y')) return;
    handler(warning);
  },

  kit: {
    adapter: adapter({
      pages: 'dist',
      assets: 'dist',
      fallback: 'index.html',
      precompress: false,
      strict: false // Allow fallback for SPA routing
    }),
    // For embedding in VSCode webview
    paths: {
      base: '',
      relative: true
    },
    // Single-page app mode - all routes handled client-side
    appDir: '_app'
  }
};

export default config;
