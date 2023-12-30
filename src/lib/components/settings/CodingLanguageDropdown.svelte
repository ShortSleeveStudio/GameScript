<script lang="ts">
    import {
        PROGRAMMING_LANGUAGE_DROP_DOWN_ITEMS,
        type NodeRow,
        type ProgrammingLanguageName,
    } from '@lib/api/db/db-schema';
    import type { IDbRowView } from '@lib/api/db/db-view-row-interface';
    import { Undoable, undoManager } from '@lib/utility/undo-manager';
    import { Dropdown, SkeletonPlaceholder } from 'carbon-components-svelte';
    import { onDestroy } from 'svelte';
    import type { Readable } from 'svelte/motion';

    // Find current value
    export let programmingLanguageNode: IDbRowView<NodeRow>;

    // TODO: https://svelte-5-preview.vercel.app/status
    const isLoading: Readable<boolean> = programmingLanguageNode.isLoading;
    let boundValue: ProgrammingLanguageName = <ProgrammingLanguageName>(
        $programmingLanguageNode.name
    );
    let currentValue: ProgrammingLanguageName = <ProgrammingLanguageName>(
        $programmingLanguageNode.name
    );

    onDestroy(
        programmingLanguageNode.subscribe((node: NodeRow) => {
            if (node.name !== currentValue) {
                boundValue = <ProgrammingLanguageName>node.name;
                currentValue = <ProgrammingLanguageName>node.name;
            }
        }),
    );

    async function onSelect(): Promise<void> {
        const newValue = boundValue;
        const oldValue = currentValue;
        if (oldValue === newValue) return;

        await programmingLanguageNode.updateColumn('name', newValue);
        undoManager.register(
            new Undoable(
                'Set default field type',
                async () => {
                    await programmingLanguageNode.updateColumn('name', oldValue);
                },
                async () => {
                    await programmingLanguageNode.updateColumn('name', newValue);
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
        direction="bottom"
        on:select={onSelect}
    />
{/if}
