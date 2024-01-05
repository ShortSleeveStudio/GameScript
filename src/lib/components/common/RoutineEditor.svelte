<script lang="ts">
    import {
        PROGRAMMING_LANGUAGE_ID_CS,
        type ProgrammingLanguagePrincipal,
        type Routine,
    } from '@lib/api/db/db-schema';
    import type { IDbRowView } from '@lib/api/db/db-view-row-interface';
    import { isDarkMode } from '@lib/stores/app/darkmode';
    import { programmingLanguagePrincipalTable } from '@lib/tables/programming-language-principal';
    import { MONACO_PROGRAMMING_LANGUAGE_NAMES } from '@lib/utility/monaco';
    import { Undoable, undoManager } from '@lib/utility/undo-manager';
    import * as monaco from 'monaco-editor';
    import { onDestroy, onMount } from 'svelte';
    import type { Unsubscriber } from 'svelte/motion';
    import { get } from 'svelte/store';

    export let rowView: IDbRowView<Routine> | undefined;
    $: onRowViewChanged(rowView); // Used to detect changes in the row view

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

    function onRowChanged(newRoutine: Routine) {
        editor.setValue(newRoutine.code);
    }

    async function onSave() {
        if (!rowView) return;
        const newValue = editor.getValue();
        const oldValue = get(rowView).code;
        if (oldValue === newValue) return;

        setEditorDisabled(true);
        await rowView.updateColumn('code', newValue);
        setEditorDisabled(false);

        undoManager.register(
            new Undoable(
                'Default field type selection',
                async () => {
                    if (!rowView) throw Error('Database view of routine is missing');
                    setEditorDisabled(true);
                    await rowView.updateColumn('code', oldValue);
                    setEditorDisabled(false);
                    blurEditor();
                },
                async () => {
                    if (!rowView) throw Error('Database view of routine is missing');
                    setEditorDisabled(true);
                    await rowView.updateColumn('code', newValue);
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
        monaco.editor.setModelLanguage(
            model,
            MONACO_PROGRAMMING_LANGUAGE_NAMES[principalLanguageRow.principal],
        );
    }

    function onRowViewChanged(row: IDbRowView<Routine> | undefined) {
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
        const options: monaco.editor.IStandaloneEditorConstructionOptions = {
            value: rowView ? get(rowView).code : '',
            language: MONACO_PROGRAMMING_LANGUAGE_NAMES[principalLanguageId],
            theme: $isDarkMode ? 'vs-dark' : 'vs',
            automaticLayout: true,
            contextmenu: false,
            minimap: { enabled: false },
            scrollBeyondLastLine: false,
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

<div class="resizable">
    <div class="code-editor" bind:this={container}></div>
</div>

<style>
    .code-editor {
        width: 100%;
        height: 100%;
    }
    .resizable {
        overflow: auto;
        height: var(--me-default-height);
        resize: vertical;
    }
</style>
