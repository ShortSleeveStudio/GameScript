<script lang="ts">
    import { FIELD_TYPE_DROP_DOWN_ITEMS, type DefaultFieldRow } from '@lib/api/db/db-types';
    import type { DbRowView } from '@lib/api/db/db-view-row';
    import { isApplyingDefaultFields } from '@lib/stores/app/applying-default-fields';
    import { Undoable, undoManager } from '@lib/utility/undo-manager';
    import { Dropdown, SkeletonPlaceholder } from 'carbon-components-svelte';
    import { onMount } from 'svelte';
    import type { Readable, Unsubscriber } from 'svelte/store';

    export let rowView: DbRowView<DefaultFieldRow>;

    // TODO: https://svelte-5-preview.vercel.app/status
    const isLoading: Readable<boolean> = rowView.isColumnLoading('fieldType');
    let boundValue: number = $rowView.fieldType;
    let currentValue: number = $rowView.fieldType;
    let rowViewUnsubscriber: Unsubscriber;
    onMount(() => {
        rowViewUnsubscriber = rowView.subscribe((row: DefaultFieldRow) => {
            if (row.fieldType !== currentValue) {
                boundValue = row.fieldType;
                currentValue = row.fieldType;
            }
        });
    });

    async function onSelect(): Promise<void> {
        const newValue = boundValue;
        const oldValue = currentValue;
        if (oldValue === newValue) return;

        await rowView.updateColumn('fieldType', newValue);
        undoManager.register(
            new Undoable(
                'Set default field type',
                async () => {
                    await rowView.updateColumn('fieldType', oldValue);
                },
                async () => {
                    await rowView.updateColumn('fieldType', newValue);
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
        items={FIELD_TYPE_DROP_DOWN_ITEMS}
        bind:selectedId={boundValue}
        disabled={$rowView.required || $isApplyingDefaultFields}
        direction="top"
        on:select={onSelect}
    />
{/if}
