// @ts-expect-error Something funny about these imports
import editorWorker from 'monaco-editor/esm/vs/editor/editor.worker?worker';
// @ts-expect-error Something funny about these imports
import jsonWorker from 'monaco-editor/esm/vs/language/json/json.worker?worker';
// @ts-expect-error Something funny about these imports
import cssWorker from 'monaco-editor/esm/vs/language/css/css.worker?worker';
// @ts-expect-error Something funny about these imports
import htmlWorker from 'monaco-editor/esm/vs/language/html/html.worker?worker';
// @ts-expect-error Something funny about these imports
import tsWorker from 'monaco-editor/esm/vs/language/typescript/ts.worker?worker';

self.MonacoEnvironment = {
    getWorker(_: string, label: string) {
        if (label === 'json') {
            return new jsonWorker();
        }
        if (label === 'css' || label === 'scss' || label === 'less') {
            return new cssWorker();
        }
        if (label === 'html' || label === 'handlebars' || label === 'razor') {
            return new htmlWorker();
        }
        if (label === 'typescript' || label === 'javascript') {
            return new tsWorker();
        }
        return new editorWorker();
    },
};

// The indices must match PROGRAMMING_LANGUAGE_NAMES
export const MONACO_PROGRAMMING_LANGUAGE_NAMES: string[] = ['csharp', 'cpp'];

// Setup custom languages
// TODO
// languages.register({
//     id: LANGUAGE_ID_SNIPPET,
// });
// languages.setLanguageConfiguration(LANGUAGE_ID_SNIPPET, snippetConf);
// languages.setMonarchTokensProvider(LANGUAGE_ID_SNIPPET, snippetLang);
