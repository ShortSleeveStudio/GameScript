import path from 'path';
import { defineConfig } from 'vitest/config';

export default defineConfig({
    resolve: {
        alias: [
            {
                find: '@lib',
                replacement: path.resolve(__dirname, './src/renderer/src/lib'),
            },
            // {
            //     find: /^monaco-editor$/,
            //     replacement: __dirname + '/node_modules/monaco-editor/esm/vs/editor/editor.api',
            // },
        ],
    },
    test: {},
});
