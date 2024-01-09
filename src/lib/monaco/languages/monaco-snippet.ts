import type { languages } from 'monaco-editor';

export const LANGUAGE_ID_SNIPPET: string = 'snippets';

export const snippetConf: languages.LanguageConfiguration = {
    brackets: [['${', '}']],
    autoClosingPairs: [{ open: '${', close: '}' }],
    surroundingPairs: [{ open: '${', close: '}' }],
};

export const snippetLang = <languages.IMonarchLanguage>{
    ignoreCase: true,
    defaultToken: 'invalid',

    brackets: [{ open: '${', close: '}', token: 'delimiter.bracket' }],
    tokenizer: {
        root: [{ include: '@body' }],
        body: [[/[^${]*/, { token: 'string', next: '@templateOpen' }]],
        templateOpen: [[/\$\{/, { token: '@brackets', bracket: '@open', next: '@templateIndex' }]],
        templateIndex: [[/[1-9]{1}[0-9]*/, { token: 'number', next: '@templateColon' }]],
        templateColon: [[/:/, { token: 'keyword', next: '@templatePlaceholder' }]],
        templatePlaceholder: [[/[^}]+/, { token: 'identifier', next: '@templateClose' }]],
        templateClose: [[/\}/, { token: '@brackets', bracket: '@close', next: '@popall' }]],
    },
};
