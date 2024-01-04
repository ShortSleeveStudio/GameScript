<script lang="ts">
    import {
        PROGRAMMING_LANGUAGE_DROP_DOWN_ITEMS,
        type ProgrammingLanguageId,
    } from '@lib/api/db/db-schema';
    import {
        programmingLanguagePrincipaRow,
        programmingLanguagePrincipalId,
        programmingLanguagePrincipalIsLoading,
    } from '@lib/tables/programming-language-principal';
    import { Undoable, undoManager } from '@lib/utility/undo-manager';
    import { Dropdown } from 'carbon-components-svelte';
    import { onDestroy } from 'svelte';

    let boundValue: ProgrammingLanguageId = $programmingLanguagePrincipalId;
    let currentValue: ProgrammingLanguageId = $programmingLanguagePrincipalId;

    async function onSelect(): Promise<void> {
        const newValue = boundValue;
        const oldValue = currentValue;
        if (oldValue === newValue) return;

        await programmingLanguagePrincipaRow.updateColumn('principal', newValue);
        undoManager.register(
            new Undoable(
                'Set default field type',
                async () => {
                    await programmingLanguagePrincipaRow.updateColumn('principal', oldValue);
                },
                async () => {
                    await programmingLanguagePrincipaRow.updateColumn('principal', newValue);
                },
            ),
        );
    }

    function onLanguageChanged(languageId: ProgrammingLanguageId) {
        if (languageId !== currentValue) {
            boundValue = languageId;
            currentValue = languageId;
        }
    }
    onDestroy(programmingLanguagePrincipalId.subscribe(onLanguageChanged));
</script>

<Dropdown
    size="sm"
    items={PROGRAMMING_LANGUAGE_DROP_DOWN_ITEMS}
    disabled={$programmingLanguagePrincipalIsLoading}
    bind:selectedId={boundValue}
    direction="bottom"
    on:select={onSelect}
/>
