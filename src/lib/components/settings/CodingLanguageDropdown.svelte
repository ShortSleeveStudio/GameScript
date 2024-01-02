<script lang="ts">
    import {
        PROGRAMMING_LANGUAGE_DROP_DOWN_ITEMS,
        PROGRAMMING_LANGUAGE_ID_CS,
        type ProgrammingLanguageId,
        type ProgrammingLanguagePrincipal,
    } from '@lib/api/db/db-schema';
    import type { IDbRowView } from '@lib/api/db/db-view-row-interface';
    import { type TableAndRows } from '@lib/stores/utility/table-and-row-store';
    import { programmingLanguagePrincipal } from '@lib/tables/programming-language-principal';
    import { Undoable, undoManager } from '@lib/utility/undo-manager';
    import { Dropdown, SkeletonPlaceholder } from 'carbon-components-svelte';
    import { onDestroy } from 'svelte';
    import { get, type Readable } from 'svelte/store';

    // TODO: https://svelte-5-preview.vercel.app/status
    let isLoading: Readable<boolean>;
    let boundValue: ProgrammingLanguageId = PROGRAMMING_LANGUAGE_ID_CS;
    let currentValue: ProgrammingLanguageId = PROGRAMMING_LANGUAGE_ID_CS;

    onDestroy(programmingLanguagePrincipal.subscribe(onTableOrRowsChanged));

    function onTableOrRowsChanged(tableAndRows: TableAndRows<ProgrammingLanguagePrincipal>) {
        // There should only really ever be one row
        for (let i = 0; i < tableAndRows.rows.length; i++) {
            const rowView: IDbRowView<ProgrammingLanguagePrincipal> = tableAndRows.rows[i];
            const row: ProgrammingLanguagePrincipal = get(rowView);
            isLoading = rowView.isLoading;

            if (row.principal !== currentValue) {
                boundValue = row.principal;
                currentValue = row.principal;
            }
        }
    }

    async function onSelect(): Promise<void> {
        const newValue = boundValue;
        const oldValue = currentValue;
        if (oldValue === newValue) return;

        // Fetch selected row
        if ($programmingLanguagePrincipal.rows.length !== 1)
            throw new Error('Selected programming language table is corrupt');
        const selectedLanguage: IDbRowView<ProgrammingLanguagePrincipal> =
            $programmingLanguagePrincipal.rows[0];

        await selectedLanguage.updateColumn('principal', newValue);
        undoManager.register(
            new Undoable(
                'Set default field type',
                async () => {
                    await selectedLanguage.updateColumn('principal', oldValue);
                },
                async () => {
                    await selectedLanguage.updateColumn('principal', newValue);
                },
            ),
        );
    }
</script>

{#if $isLoading || isLoading === undefined}
    <SkeletonPlaceholder style="height: 2rem; max-height: 2rem; width: 100%;" />
{:else}
    <Dropdown
        size="sm"
        items={PROGRAMMING_LANGUAGE_DROP_DOWN_ITEMS}
        disabled={$isLoading || isLoading === undefined}
        bind:selectedId={boundValue}
        direction="bottom"
        on:select={onSelect}
    />
{/if}
