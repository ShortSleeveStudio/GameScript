<script lang="ts">
    import type { Routine } from '@lib/api/db/db-schema';
    import type { IDbRowView } from '@lib/api/db/db-view-row-interface';
    import type { FocusPayloadRoutine } from '@lib/stores/app/focus';
    import RowNameInput from '../common/RowNameInput.svelte';
    import RoutineEditor from '../common/RoutineEditor.svelte';
    import RowColumnId from '../common/RowColumnId.svelte';
    import RowColumnTextArea from '../common/RowColumnTextArea.svelte';
    import {
        ROUTINES_PLACEHOLDER_NAME,
        ROUTINES_PLACEHOLDER_NOTES,
        ROUTINES_UNDO_DEFAULT,
        ROUTINES_UNDO_NAME,
        ROUTINES_UNDO_NOTES,
    } from '@lib/constants/settings';
    import SettingsCodingDefaultRoutinesRadio from '../settings/SettingsCodingDefaultRoutinesRadio.svelte';

    export let rowView: IDbRowView<Routine>;
    export let payload: FocusPayloadRoutine;
</script>

<h2>Routine</h2>
<p>
    <sup>ID</sup>
    <RowColumnId {rowView} />
</p>
<p>
    <sup>Name</sup>
    <RowNameInput
        {rowView}
        undoText={ROUTINES_UNDO_NAME}
        inputPlaceholder={ROUTINES_PLACEHOLDER_NAME}
        uniqueNameTracker={payload.uniqueNameTracker}
        isInspectorField={true}
    />
</p>
<p>
    <sup>Default</sup>
    <SettingsCodingDefaultRoutinesRadio {rowView} undoText={ROUTINES_UNDO_DEFAULT} />
</p>
<p>
    <sup>Code</sup>
    <RoutineEditor {rowView} columnName={'code'} />
</p>
<p>
    <sup>Notes</sup>
    <RowColumnTextArea
        {rowView}
        undoText={ROUTINES_UNDO_NOTES}
        columnName={'notes'}
        placeholder={ROUTINES_PLACEHOLDER_NOTES}
    />
</p>
