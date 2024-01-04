<script lang="ts" generics="RowType extends Row">
    import { type Row } from '@lib/api/db/db-schema';
    import type { IDbRowView } from '@lib/api/db/db-view-row-interface';
    import { TextInput } from 'carbon-components-svelte';

    export let rowView: IDbRowView<RowType>;
</script>

<TextInput size="sm" value={$rowView.id} disabled={true} />
