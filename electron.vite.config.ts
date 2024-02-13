import { svelte } from '@sveltejs/vite-plugin-svelte';
import { defineConfig, externalizeDepsPlugin } from 'electron-vite';
import path from 'path';

export default defineConfig({
    main: {
        plugins: [externalizeDepsPlugin()],
    },
    preload: {
        plugins: [externalizeDepsPlugin()],
    },
    renderer: {
        plugins: [svelte()],
        worker: {
            format: 'es',
        },
        resolve: {
            alias: {
                '@lib': path.resolve(__dirname, './src/renderer/src/lib'),
            },
        },
    },
});
