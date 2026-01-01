<script lang="ts">
    /**
     * Select option that binds to a DbRowView.
     *
     * Renders a select option using rowView.data for reactive access.
     *
     * Ported from GameScriptElectron SelectItemCustom.
     */
    import type { Row } from '@gamescript/shared';
    import type { IDbRowView } from '$lib/db';

    interface Props {
        rowView: IDbRowView<Row>;
        valueColumn?: string;
        textColumn?: string;
    }

    let { rowView, valueColumn = 'id', textColumn = 'name' }: Props = $props();
</script>

<option class="select-option" value={rowView.data[valueColumn]}>
    {rowView.data[textColumn]}
</option>

<style>
    .select-option {
        background: var(--gs-bg-primary);
        color: var(--gs-fg-primary);
    }
</style>
