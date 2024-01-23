<script lang="ts">
    import { type Routine } from '@lib/api/db/db-schema';
    import type { IDbRowView } from '@lib/api/db/db-view-row-interface';
    import type { FocusPayloadRoutine } from '@lib/stores/app/focus';
    import RowColumnId from '../common/RowColumnId.svelte';
    import RowNameInput from '../common/RowNameInput.svelte';
    import {
        ACTORS_UNDO_NAME,
        ACTORS_PLACEHOLDER_NAME,
        ACTORS_UNDO_COLOR,
    } from '@lib/constants/settings';
    import RowColumnColor from '../common/RowColumnColor.svelte';
    import RowColumnLocalization from '../common/RowColumnLocalization.svelte';

    export let rowView: IDbRowView<Routine>;
    export let payload: FocusPayloadRoutine;
</script>

<h2>Actor</h2>
<p>
    <sup>ID</sup>
    <RowColumnId {rowView} />
</p>
<p>
    <sup>Name</sup>
    <RowNameInput
        {rowView}
        undoText={ACTORS_UNDO_NAME}
        inputPlaceholder={ACTORS_PLACEHOLDER_NAME}
        uniqueNameTracker={payload.uniqueNameTracker}
        isInspectorField={true}
    />
</p>
<p>
    <sup>Node Color</sup>
    <RowColumnColor {rowView} undoText={ACTORS_UNDO_COLOR} />
</p>
<p>
    <sup>Localized Name</sup>
    <RowColumnLocalization {rowView} columnName={'localizedName'} />
</p>
