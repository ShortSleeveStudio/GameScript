<script lang="ts">
    import {
        PROGRAMMING_LANGUAGE_CS,
        PROGRAMMING_LANGUAGE_DROPDOWN_ITEMS,
        type ProgrammingLanguageId,
    } from '@common/common-types';
    import { db } from '@lib/api/db/db';
    import { type ProgrammingLanguagePrincipal, type Row } from '@common/common-schema';
    import type { IDbRowView } from '@lib/api/db/db-view-row-interface';
    import { IsLoadingStore } from '@lib/stores/utility/is-loading-store';
    import { programmingLanguagePrincipalTable } from '@lib/tables/programming-language-principal';
    import { Undoable, undoManager } from '@lib/utility/undo-manager';
    import { Dropdown } from 'carbon-components-svelte';
    import { onDestroy } from 'svelte';
    import type { Unsubscriber } from 'svelte/motion';
    import { get } from 'svelte/store';

    let boundValue: ProgrammingLanguageId = PROGRAMMING_LANGUAGE_CS.id;
    let currentValue: ProgrammingLanguageId = PROGRAMMING_LANGUAGE_CS.id;
    let languagePrincipalRowView: IDbRowView<ProgrammingLanguagePrincipal> | undefined;
    const isLoading: IsLoadingStore = new IsLoadingStore();

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

    async function onSelect(): Promise<void> {
        if (!languagePrincipalRowView) return;
        const newValue = boundValue;
        const oldValue = currentValue;
        if (oldValue === newValue) return;

        // Update row
        const originalRow = { ...get(languagePrincipalRowView) };
        const newRow = <Row>{ id: originalRow.id };
        newRow['principal'] = newValue;
        await isLoading.wrapPromise(db.updateRow(languagePrincipalRowView.tableType, newRow));

        // Register undo/redo
        undoManager.register(
            new Undoable(
                'set default property type',
                isLoading.wrapFunction(async () => {
                    if (!languagePrincipalRowView)
                        throw Error('Database view of default programming language is missing');
                    newRow['principal'] = oldValue;
                    await db.updateRow(languagePrincipalRowView.tableType, newRow);
                }),
                isLoading.wrapFunction(async () => {
                    if (!languagePrincipalRowView)
                        throw Error('Database view of default programming language is missing');
                    newRow['principal'] = newValue;
                    await db.updateRow(languagePrincipalRowView.tableType, newRow);
                }),
            ),
        );
    }

    function onProgrammingLanguageChanged(
        principalLanguageRow: ProgrammingLanguagePrincipal,
    ): void {
        if (principalLanguageRow.principal !== currentValue) {
            boundValue = principalLanguageRow.principal;
            currentValue = principalLanguageRow.principal;
        }
    }

    onDestroy(() => {
        if (languagePrincipalRowUnsubscriber) languagePrincipalRowUnsubscriber();
        if (languagePrincipalTableUnsubscriber) languagePrincipalTableUnsubscriber();
    });
</script>

<p>
    <sup>Programming Language</sup>
    <Dropdown
        size="sm"
        items={PROGRAMMING_LANGUAGE_DROPDOWN_ITEMS}
        disabled={$isLoading}
        bind:selectedId={boundValue}
        direction="bottom"
        on:select={onSelect}
    />
</p>
