import type { AutoComplete } from '@lib/api/db/db-schema';
import type { IDbRowView } from '@lib/api/db/db-view-row-interface';
import { autoCompleteTable } from '@lib/tables/auto-complete';
import { Position, editor, languages, type IRange } from 'monaco-editor';
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
import { get } from 'svelte/store';

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

// languages.registerCompletionItemProvider

// Auto-Complete
export class Completer implements languages.CompletionItemProvider {
    provideCompletionItems(
        model: editor.ITextModel,
        position: Position,
    ): languages.ProviderResult<languages.CompletionList> {
        const word: editor.IWordAtPosition = model.getWordUntilPosition(position);
        const range: IRange = {
            startLineNumber: position.lineNumber,
            endLineNumber: position.lineNumber,
            startColumn: word.startColumn,
            endColumn: word.endColumn,
        };
        return {
            suggestions: this.createSuggestionsList(range),
        };
    }

    private createSuggestionsList(range: IRange): languages.CompletionItem[] {
        const suggestions: languages.CompletionItem[] = [];
        const rowViews: IDbRowView<AutoComplete>[] = get(autoCompleteTable);
        for (let i = 0; i < rowViews.length; i++) {
            const rowView: IDbRowView<AutoComplete> = rowViews[i];
            const row: AutoComplete = get(rowView);
            if (!row.name) continue;
            suggestions.push(<languages.CompletionItem>{
                label: row.name,
                kind: row.icon,
                insertText: row.insertion,
                insertTextRules: row.rule,
                documentation: row.documentation ? row.documentation : undefined,
                range: range,
            });
        }
        return suggestions;
    }
}
const completerSingleton = new Completer();
MONACO_PROGRAMMING_LANGUAGE_NAMES.forEach((languageName) => {
    languages.registerCompletionItemProvider(languageName, completerSingleton);
});

// // TODO: right now a table update results in a complete rebuild of registrations
// //       might be better to find a way to retain auto-completes that already exist
// //       bu the data might be stale.
// //       bu the data might be stale.
// let completionProviderIdToUnsubscribe: Map<number, Unsubscriber> = new Map();
// const completionProviderIdToDisposables: Map<number, IDisposable[]> = new Map();
// autoCompleteTable.subscribe((rowViews: IDbRowView<AutoComplete>[]) => {
//     // Dispose of old providers
//     const newMap: Map<number, Unsubscriber> = new Map();
//     for (let i = 0; i < rowViews.length; i++) {
//         // Grab row
//         const row: IDbRowView<AutoComplete> = rowViews[i];

//         // Subscribe to changes
//         let unsub: Unsubscriber | undefined = completionProviderIdToUnsubscribe.get(row.id);
//         if (unsub) {
//             completionProviderIdToUnsubscribe.delete(row.id);
//         } else {
//             unsub = row.subscribe(onAutoCompleteChanged);
//         }
//         newMap.set(row.id, unsub);
//     }

//     // Use the old map to unsubscribe to missing rows
//     completionProviderIdToUnsubscribe.forEach((unsubscriber: Unsubscriber, rowId: number) => {
//         // Unregister auto-completes
//         onAutoCompleteDeleted(rowId);

//         // Unsubscribe from the row
//         unsubscriber();
//     });

//     // Set new map
//     completionProviderIdToUnsubscribe = newMap;
// });

// function onAutoCompleteDeleted(rowId: number) {
//     const oldDisposables: IDisposable[] | undefined = completionProviderIdToDisposables.get(rowId);
//     if (oldDisposables) {
//         oldDisposables.forEach((disposable) => disposable.dispose());
//         completionProviderIdToDisposables.delete(rowId);
//     }
// }

// function onAutoCompleteChanged(row: AutoComplete) {
//     // Dispose of old providers (one for each language)
//     onAutoCompleteDeleted(row.id);

//     // Register new providers
//     console.log(`Registering completion provider for row id: ${row.id}`);
//     const newDisposables: IDisposable[] = [];
//     MONACO_PROGRAMMING_LANGUAGE_NAMES.forEach((languageName) => {
//         const newDisposable = newDisposables.push(newDisposable);
//     });
//     completionProviderIdToDisposables.set(row.id, newDisposables);
// }
