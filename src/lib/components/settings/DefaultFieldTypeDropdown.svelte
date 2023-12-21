<script lang="ts">
    import { FIELD_TYPE_DROP_DOWN_ITEMS, type DefaultFieldRow } from '@lib/api/db/db-types';
    import type { DbRowView } from '@lib/api/db/db-view-row';
    import { Dropdown, SkeletonPlaceholder } from 'carbon-components-svelte';
    import type { Readable } from 'svelte/store';

    export let rowView: DbRowView<DefaultFieldRow>;
    export let isApplyingDefaultFields: boolean;

    // TODO: https://svelte-5-preview.vercel.app/status
    const isLoading: Readable<boolean> = rowView.isLoading;
</script>

{#if $isLoading}
    <SkeletonPlaceholder style="height: 2rem; max-height: 2rem; width: 100%;" />
{:else}
    <Dropdown
        size="sm"
        items={FIELD_TYPE_DROP_DOWN_ITEMS}
        bind:selectedId={$rowView.fieldType}
        disabled={$rowView.required || isApplyingDefaultFields}
        direction="top"
    />
{/if}
