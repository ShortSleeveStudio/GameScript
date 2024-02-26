<script lang="ts">
    import { type Row } from '@common/common-schema';
    import type { IDbRowView } from '@lib/api/db/db-view-row-interface';
    import { TextInput } from 'carbon-components-svelte';

    export let rowView: IDbRowView<Row>;
    export let columnName: string = 'id';
</script>

<!-- TODO -->
<TextInput size="sm" value={$rowView[columnName]} disabled={true} />
