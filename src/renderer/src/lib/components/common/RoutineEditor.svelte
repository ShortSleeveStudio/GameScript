<script lang="ts">
    import { PROGRAMMING_LANGUAGE_CS } from '@common/common-types';

    import { IsLoadingStore } from '@lib/stores/utility/is-loading-store';

    import { db } from '@lib/api/db/db';

    import { type Row, type ProgrammingLanguagePrincipal } from '@lib/api/db/db-schema';
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
    export let rowView: IDbRowView<Row> | undefined;
    export let disabled: boolean = false;
    $: onRowViewChanged(rowView); // Used to detect if the rowView passed in is swapped for another

    const isLoading: IsLoadingStore = new IsLoadingStore();
    let container: HTMLElement;
    let editor: monaco.editor.IStandaloneCodeEditor;
    let didBlurUnsubscribe: monaco.IDisposable;
    let didFocusUnsubscribe: monaco.IDisposable;
    let rowChangeUnsubscribe: Unsubscriber;
    let isDarkModeUnsubscribe: Unsubscriber = isDarkMode.subscribe(onDarkModeChanged);
    let languagePrincipalRowView: IDbRowView<ProgrammingLanguagePrincipal> | undefined;
    let internallyDisabled: boolean = false;
    let disabledState: boolean = false;
    $: {
        if (editor) setEditorDisabled($isLoading || internallyDisabled || disabled);
    }

    // TODO
    // https://svelte-5-preview.vercel.app/status
    // These single row tables could be stateful variables of a class
    let languagePrincipalRowUnsubscriber: Unsubscriber | undefined;
    let languagePrincipalTableUnsubscriber: Unsubscriber | undefined =
        programmingLanguagePrincipalTable.subscribe(
            (rowViews: IDbRowView<ProgrammingLanguagePrincipal>[]) => {
                if (rowViews.length === 1 && languagePrincipalRowView !== rowViews[0]) {
                    languagePrincipalRowView = rowViews[0];
                    languagePrincipalRowUnsubscriber = languagePrincipalRowView.subscribe(
                        onProgrammingLanguageChanged,
                    );
                }
            },
        );

    function blurEditor(): void {
        if (editor.hasTextFocus() && document.activeElement instanceof HTMLElement) {
            document.activeElement.blur();
        }
    }

    function setEditorDisabled(isDisabled: boolean): void {
        if (!editor || isDisabled === disabledState) return;
        editor.updateOptions({ readOnly: isDisabled });
        if (isDisabled) {
            container.classList.add('code-editor-disabled');
        } else {
            container.classList.remove('code-editor-disabled');
        }
        disabledState = isDisabled;
    }

    function setHandleScroll(shouldHandle: boolean): void {
        editor.updateOptions({
            scrollbar: {
                handleMouseWheel: shouldHandle,
            },
        });
    }

    function onRowChanged(newRoutine: Row): void {
        editor.setValue(<string>newRoutine[columnName]);
    }

    async function onEditorFocus(): Promise<void> {
        if (!rowView) return;
        setHandleScroll(true);
    }

    async function onEditorBlur(): Promise<void> {
        if (!rowView) return;
        setHandleScroll(false);
        const newValue = editor.getValue();
        const oldValue = get(rowView)[columnName];
        if (oldValue === newValue) return;

        // Update column
        const newRow = <Row>{ ...get(rowView) };
        newRow[columnName] = newValue;
        await isLoading.wrapPromise(db.updateRow(rowView.tableId, newRow));

        undoManager.register(
            new Undoable(
                'default property type selection',
                isLoading.wrapFunction(async () => {
                    if (!rowView) throw Error('Database view of routine is missing');
                    newRow[columnName] = oldValue;
                    await db.updateRow(rowView.tableId, newRow);
                    blurEditor();
                }),
                isLoading.wrapFunction(async () => {
                    if (!rowView) throw Error('Database view of routine is missing');
                    newRow[columnName] = newValue;
                    await db.updateRow(rowView.tableId, newRow);
                    blurEditor();
                }),
            ),
        );
    }

    function onDarkModeChanged(isDark: boolean): void {
        monaco.editor.setTheme(isDark ? 'vs-dark' : 'vs');
    }

    function onProgrammingLanguageChanged(
        principalLanguageRow: ProgrammingLanguagePrincipal,
    ): void {
        if (!editor) return;
        const model: monaco.editor.ITextModel | null = editor.getModel();
        if (!model) throw new Error('Code editor was not properly initialized');
        const languageName: string = languageOverride
            ? languageOverride
            : MONACO_PROGRAMMING_LANGUAGE_NAMES[principalLanguageRow.principal];
        monaco.editor.setModelLanguage(model, languageName);
    }

    function onRowViewChanged(row: IDbRowView<Row> | undefined): void {
        if (!editor) return;
        if (rowChangeUnsubscribe) rowChangeUnsubscribe();
        if (row) {
            internallyDisabled = false;
            rowChangeUnsubscribe = row.subscribe(onRowChanged);
        } else {
            internallyDisabled = true;
        }
    }

    onMount(() => {
        // Initialize the editor
        let principalLanguageId =
            $languagePrincipalRowView?.principal ?? PROGRAMMING_LANGUAGE_CS.id;
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
            scrollbar: {
                handleMouseWheel: false,
            },
        };
        editor = monaco.editor.create(container, options);
        // Add save command
        editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS, blurEditor);
        // Blur Callback
        didBlurUnsubscribe = editor.onDidBlurEditorWidget(onEditorBlur);
        didFocusUnsubscribe = editor.onDidFocusEditorWidget(onEditorFocus);
        // Row Change Callback
        onRowViewChanged(rowView);
    });

    onDestroy(() => {
        if (editor) editor.dispose();
        if (didBlurUnsubscribe) didBlurUnsubscribe.dispose();
        if (didFocusUnsubscribe) didFocusUnsubscribe.dispose();
        if (isDarkModeUnsubscribe) isDarkModeUnsubscribe();
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
