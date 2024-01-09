<script lang="ts">
    import {
        PROGRAMMING_LANGUAGE_DROP_DOWN_ITEMS,
        type ProgrammingLanguageId,
        type ProgrammingLanguagePrincipal,
        PROGRAMMING_LANGUAGE_ID_CS,
    } from '@lib/api/db/db-schema';
    import type { IDbRowView } from '@lib/api/db/db-view-row-interface';
    import type { IsLoading } from '@lib/stores/utility/is-loading';
    import { programmingLanguagePrincipalTable } from '@lib/tables/programming-language-principal';
    import { Undoable, undoManager } from '@lib/utility/undo-manager';
    import { Dropdown } from 'carbon-components-svelte';
    import { onDestroy } from 'svelte';
    import type { Unsubscriber } from 'svelte/motion';

    let boundValue: ProgrammingLanguageId = PROGRAMMING_LANGUAGE_ID_CS;
    let currentValue: ProgrammingLanguageId = PROGRAMMING_LANGUAGE_ID_CS;
    let languagePrincipalRowView: IDbRowView<ProgrammingLanguagePrincipal> | undefined;
    let isRowViewLoading: IsLoading | undefined;

    // TODO
    // https://svelte-5-preview.vercel.app/status
    // These single row tables could be stateful variables of a class
    let languagePrincipalRowUnsubscriber: Unsubscriber | undefined;
    let languagePrincipalTableUnsubscriber: Unsubscriber | undefined =
        programmingLanguagePrincipalTable.subscribe(
            (rowViews: IDbRowView<ProgrammingLanguagePrincipal>[]) => {
                if (rowViews.length === 1) {
                    languagePrincipalRowView = rowViews[0];
                    isRowViewLoading = languagePrincipalRowView.isLoading;
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

        await languagePrincipalRowView.updateColumn('principal', newValue);
        undoManager.register(
            new Undoable(
                'set default field type',
                async () => {
                    if (!languagePrincipalRowView)
                        throw Error('Database view of default programming language is missing');
                    await languagePrincipalRowView.updateColumn('principal', oldValue);
                },
                async () => {
                    if (!languagePrincipalRowView)
                        throw Error('Database view of default programming language is missing');
                    await languagePrincipalRowView.updateColumn('principal', newValue);
                },
            ),
        );
    }

    function onProgrammingLanguageChanged(principalLanguageRow: ProgrammingLanguagePrincipal) {
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
        items={PROGRAMMING_LANGUAGE_DROP_DOWN_ITEMS}
        disabled={!isRowViewLoading || $isRowViewLoading}
        bind:selectedId={boundValue}
        direction="bottom"
        on:select={onSelect}
    />
</p>
