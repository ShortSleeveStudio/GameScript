module.exports = {
    parserOptions: {
        extraFileExtensions: ['.svelte'],
        sourceType: 'module',
        ecmaVersion: 2020,
    },
    extends: [
        'eslint:recommended',
        'plugin:svelte/recommended',
        'plugin:@typescript-eslint/recommended',
        'prettier',
        // '@electron-toolkit/eslint-config-ts/recommended',
        // '@electron-toolkit/eslint-config-prettier',
    ],
    parser: '@typescript-eslint/parser',
    plugins: ['@typescript-eslint'],
    overrides: [
        {
            files: ['*.svelte'],
            parser: 'svelte-eslint-parser',
            parserOptions: {
                parser: '@typescript-eslint/parser',
            },
        },
    ],
    rules: {
        '@typescript-eslint/explicit-function-return-type': ['error', { allowExpressions: true }],
    },
};
