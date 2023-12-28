<script lang="ts">
    import {
        PROGRAMMING_LANGUAGE_DROP_DOWN_ITEMS,
        type SelectedProgrammingLanguageRow,
    } from '@lib/api/db/db-types';
    import type { IDbRowView } from '@lib/api/db/db-view-row-interface';
    import { Undoable, undoManager } from '@lib/utility/undo-manager';
    import { Dropdown, SkeletonPlaceholder } from 'carbon-components-svelte';
    import { onDestroy } from 'svelte';
    import type { Readable } from 'svelte/motion';

    export let rowView: IDbRowView<SelectedProgrammingLanguageRow>;

    // TODO: https://svelte-5-preview.vercel.app/status
    const isLoading: Readable<boolean> = rowView.isColumnLoading('languageId');
    let boundValue: number = $rowView.languageId;
    let currentValue: number = $rowView.languageId;

    onDestroy(
        rowView.subscribe((row: SelectedProgrammingLanguageRow) => {
            if (row.languageId !== currentValue) {
                boundValue = row.languageId;
                currentValue = row.languageId;
            }
        }),
    );

    async function onSelect(): Promise<void> {
        const newValue = boundValue;
        const oldValue = currentValue;
        if (oldValue === newValue) return;

        await rowView.updateColumn('languageId', newValue);
        undoManager.register(
            new Undoable(
                'Set default field type',
                async () => {
                    await rowView.updateColumn('languageId', oldValue);
                },
                async () => {
                    await rowView.updateColumn('languageId', newValue);
                },
            ),
        );
    }
</script>

{#if $isLoading}
    <SkeletonPlaceholder style="height: 2rem; max-height: 2rem; width: 100%;" />
{:else}
    <Dropdown
        size="sm"
        items={PROGRAMMING_LANGUAGE_DROP_DOWN_ITEMS}
        disabled={$isLoading}
        bind:selectedId={boundValue}
        direction="top"
        on:select={onSelect}
    />
{/if}
