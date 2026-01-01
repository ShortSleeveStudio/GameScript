<script lang="ts">
    /**
     * Read-only text display for a row column.
     *
     * Simply displays the value of a column with ellipsis overflow.
     * Ported from GameScriptElectron.
     */
    import type { Row } from '@gamescript/shared';
    import type { IDbRowView } from '$lib/db';

    interface Props {
        rowView: IDbRowView<Row>;
        columnName: string;
    }

    let { rowView, columnName }: Props = $props();
</script>

<span class="overflow-ellipsis">
    {rowView.data[columnName]}
</span>

<style>
    .overflow-ellipsis {
        display: block;
        text-overflow: ellipsis;
        white-space: nowrap;
        overflow: hidden;
        max-width: 100%;
    }
</style>
