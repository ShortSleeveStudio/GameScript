<script lang="ts" generics="RowType extends Row">
    import {
        PROGRAMMING_LANGUAGE_ID_CS,
        type Row,
        type ProgrammingLanguagePrincipal,
    } from '@lib/api/db/db-schema';
    import type { IDbRowView } from '@lib/api/db/db-view-row-interface';
    import { isDarkMode } from '@lib/stores/app/darkmode';
    import { programmingLanguagePrincipalTable } from '@lib/tables/programming-language-principal';
    import { MONACO_PROGRAMMING_LANGUAGE_NAMES } from '@lib/monaco/monaco';
    import { Undoable, undoManager } from '@lib/utility/undo-manager';
    import * as monaco from 'monaco-editor';
    import { onDestroy, onMount } from 'svelte';
    import type { Unsubscriber } from 'svelte/motion';
    import { get } from 'svelte/store';

    export let languageOverride: string | undefined = undefined;
    export let columnName: string;
    export let rowView: IDbRowView<RowType> | undefined;
    $: onRowViewChanged(rowView); // Used to detect if the rowView passed in is swapped for another

    let container: HTMLElement;
    let editor: monaco.editor.IStandaloneCodeEditor;
    let didBlurUnsubscribe: monaco.IDisposable;
    let rowChangeUnsubscribe: Unsubscriber;
    let isDarkModeUnsubscribe: Unsubscriber = isDarkMode.subscribe(onDarkModeChanged);
    let languagePrincipalRowView: IDbRowView<ProgrammingLanguagePrincipal> | undefined;
    // TODO
    // https://svelte-5-preview.vercel.app/status
    // These single row tables could be stateful variables of a class
    let languagePrincipalRowUnsubscriber: Unsubscriber | undefined;
    let languagePrincipalTableUnsubscriber: Unsubscriber | undefined =
        programmingLanguagePrincipalTable.subscribe(
            (rowViews: IDbRowView<ProgrammingLanguagePrincipal>[]) => {
                if (rowViews.length === 1) {
                    languagePrincipalRowView = rowViews[0];
                    languagePrincipalRowUnsubscriber = languagePrincipalRowView.subscribe(
                        onProgrammingLanguageChanged,
                    );
                }
            },
        );

    function blurEditor() {
        if (editor.hasTextFocus() && document.activeElement instanceof HTMLElement) {
            document.activeElement.blur();
        }
    }

    function setEditorDisabled(isDisabled: boolean) {
        editor.updateOptions({ readOnly: isDisabled });
        if (isDisabled) {
            container.classList.add('code-editor-disabled');
        } else {
            container.classList.remove('code-editor-disabled');
        }
    }

    function onRowChanged(newRoutine: RowType) {
        editor.setValue(<string>newRoutine[columnName]);
    }

    async function onSave() {
        if (!rowView) return;
        const newValue = editor.getValue();
        const oldValue = get(rowView)[columnName];
        if (oldValue === newValue) return;

        setEditorDisabled(true);
        await rowView.updateColumn(columnName, newValue);
        setEditorDisabled(false);

        undoManager.register(
            new Undoable(
                'default field type selection',
                async () => {
                    if (!rowView) throw Error('Database view of routine is missing');
                    setEditorDisabled(true);
                    await rowView.updateColumn(columnName, oldValue);
                    setEditorDisabled(false);
                    blurEditor();
                },
                async () => {
                    if (!rowView) throw Error('Database view of routine is missing');
                    setEditorDisabled(true);
                    await rowView.updateColumn(columnName, newValue);
                    setEditorDisabled(false);
                    blurEditor();
                },
            ),
        );
    }

    function onDarkModeChanged(isDark: boolean) {
        monaco.editor.setTheme(isDark ? 'vs-dark' : 'vs');
    }

    function onProgrammingLanguageChanged(principalLanguageRow: ProgrammingLanguagePrincipal) {
        if (!editor) return;
        const model: monaco.editor.ITextModel | null = editor.getModel();
        if (!model) throw new Error('Code editor was not properly initialized');
        const languageName: string = languageOverride
            ? languageOverride
            : MONACO_PROGRAMMING_LANGUAGE_NAMES[principalLanguageRow.principal];
        monaco.editor.setModelLanguage(model, languageName);
    }

    function onRowViewChanged(row: IDbRowView<RowType> | undefined) {
        if (!editor) return;
        if (rowChangeUnsubscribe) rowChangeUnsubscribe();
        if (row) {
            setEditorDisabled(false);
            rowChangeUnsubscribe = row.subscribe(onRowChanged);
        } else {
            setEditorDisabled(true);
        }
    }

    onMount(() => {
        // Initialize the editor
        let principalLanguageId =
            $languagePrincipalRowView?.principal ?? PROGRAMMING_LANGUAGE_ID_CS;
        const languageName: string = languageOverride
            ? languageOverride
            : MONACO_PROGRAMMING_LANGUAGE_NAMES[principalLanguageId];
        const quickSuggestionsEnabled: boolean = languageOverride ? false : true;
        const options: monaco.editor.IStandaloneEditorConstructionOptions = {
            value: rowView ? <string>get(rowView)[columnName] : '',
            language: languageName,
            theme: $isDarkMode ? 'vs-dark' : 'vs',
            automaticLayout: true,
            contextmenu: false,
            minimap: { enabled: false },
            scrollBeyondLastLine: false,
            quickSuggestions: quickSuggestionsEnabled,
            wordWrap: 'on',
            suggest: <monaco.editor.ISuggestOptions>{
                preview: true,
            },
        };
        editor = monaco.editor.create(container, options);
        // Add save command
        editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS, blurEditor);
        // Blur Callback
        didBlurUnsubscribe = editor.onDidBlurEditorWidget(onSave);
        // Row Change Callback
        onRowViewChanged(rowView);
    });

    onDestroy(() => {
        editor.dispose();
        didBlurUnsubscribe.dispose();
        isDarkModeUnsubscribe();
        if (rowChangeUnsubscribe) rowChangeUnsubscribe();
        if (languagePrincipalRowUnsubscriber) languagePrincipalRowUnsubscriber();
        if (languagePrincipalRowUnsubscriber) languagePrincipalRowUnsubscriber();
        if (languagePrincipalTableUnsubscriber) languagePrincipalTableUnsubscriber();
    });
</script>

<!-- TODO -->
<!-- <div class="resizable"> -->
<div class="code-editor" bind:this={container}></div>

<!-- </div> -->

<style>
    .code-editor {
        width: 100%;
        /* height: 100%; */
        height: var(--me-default-height);
    }
    /* .resizable {
        overflow: auto;
        height: var(--me-default-height);
        resize: vertical;
    } */
</style>
