import { svelte } from '@sveltejs/vite-plugin-svelte';
import { defineConfig, externalizeDepsPlugin } from 'electron-vite';
import path from 'path';

export default defineConfig({
    main: {
        plugins: [externalizeDepsPlugin()],
        build: {
            rollupOptions: {
                external: ['pg-native'],
            },
        },
    },
    preload: {
        plugins: [externalizeDepsPlugin()],
        build: {
            rollupOptions: {
                external: ['pg-native'],
            },
        },
    },
    renderer: {
        plugins: [svelte()],
        worker: {
            format: 'es',
        },
        build: {
            rollupOptions: {
                external: ['pg-native'],
            },
        },
        resolve: {
            alias: {
                '@lib': path.resolve(__dirname, './src/renderer/src/lib'),
                '@common': path.resolve(__dirname, './src/common'),
                // '@xyflow': path.resolve(__dirname, './src/renderer/src/lib/vendor/xyflow'),
            },
        },
    },
});
