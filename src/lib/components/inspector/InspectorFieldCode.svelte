<script lang="ts">
    import type { ProgrammingLanguageId, Routine } from '@lib/api/db/db-schema';
    import type { IDbRowView } from '@lib/api/db/db-view-row-interface';
    import { isDarkMode } from '@lib/stores/app/darkmode';
    import { programmingLanguagePrincipalId } from '@lib/tables/programming-language-principal';
    import { MONACO_PROGRAMMING_LANGUAGE_NAMES } from '@lib/utility/monaco';
    import { Undoable, undoManager } from '@lib/utility/undo-manager';
    import * as monaco from 'monaco-editor';
    import { onDestroy, onMount } from 'svelte';
    import type { Unsubscriber } from 'svelte/motion';
    import { get } from 'svelte/store';

    export let rowView: IDbRowView<Routine>;

    let container: HTMLElement;
    let editor: monaco.editor.IStandaloneCodeEditor;
    let didBlurUnsubscribe: monaco.IDisposable;
    let rowChangeUnsubscribe: Unsubscriber;
    let isDarkModeUnsubscribe: Unsubscriber;
    let programmingLanguageUnsubscribe: Unsubscriber;

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
                    setEditorDisabled(true);
                    await rowView.updateColumn('code', oldValue);
                    setEditorDisabled(false);
                    blurEditor();
                },
                async () => {
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

    function onProgrammingLanguageChanged(languageId: ProgrammingLanguageId) {
        const model: monaco.editor.ITextModel | null = editor.getModel();
        if (!model) throw new Error('Code editor was not properly initialized');
        monaco.editor.setModelLanguage(model, MONACO_PROGRAMMING_LANGUAGE_NAMES[languageId]);
    }

    onMount(() => {
        const options: monaco.editor.IStandaloneEditorConstructionOptions = {
            value: $rowView.code,
            language: MONACO_PROGRAMMING_LANGUAGE_NAMES[$programmingLanguagePrincipalId],
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
        // Code Changed Callback
        rowChangeUnsubscribe = rowView.subscribe(onRowChanged);
        // Darkmode Callback
        isDarkModeUnsubscribe = isDarkMode.subscribe(onDarkModeChanged);
        // Programming Language Callback
        programmingLanguageUnsubscribe = programmingLanguagePrincipalId.subscribe(
            onProgrammingLanguageChanged,
        );
    });

    onDestroy(() => {
        editor.dispose();
        didBlurUnsubscribe.dispose();
        rowChangeUnsubscribe();
        isDarkModeUnsubscribe();
        programmingLanguageUnsubscribe();
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
