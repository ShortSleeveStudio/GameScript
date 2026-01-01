<script lang="ts">
    /**
     * Read-only ID display for a row.
     *
     * Shows the row ID in a disabled input field.
     * Ported from GameScriptElectron.
     */
    import type { Row } from '@gamescript/shared';
    import type { IDbRowView } from '$lib/db';

    interface Props {
        rowView: IDbRowView<Row>;
        columnName?: string;
    }

    let { rowView, columnName = 'id' }: Props = $props();
</script>

<input
    class="row-column-id"
    type="text"
    value={rowView.data[columnName]}
    disabled
    readonly
/>

<style>
    .row-column-id {
        width: 100%;
        padding: 0.25rem 0.5rem;
        font-size: 0.875rem;
        line-height: 1.25rem;
        background: var(--gs-bg-secondary);
        border: 1px solid var(--gs-border-primary);
        border-radius: 4px;
        color: var(--gs-fg-secondary);
        cursor: not-allowed;
    }
</style>
