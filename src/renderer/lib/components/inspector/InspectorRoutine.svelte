<script lang="ts">
    import type { Routine } from '@lib/api/db/db-schema';
    import type { IDbRowView } from '@lib/api/db/db-view-row-interface';
    import type { FocusPayloadRoutine } from '@lib/stores/app/focus';
    import RowNameInput from '../common/RowNameInput.svelte';
    import RoutineEditor from '../common/RoutineEditor.svelte';
    import InspectorFieldId from './InspectorFieldId.svelte';
    import RowColumnTextArea from '../common/RowColumnTextArea.svelte';

    import DefaultRoutinesRadio from '../common/DefaultRoutinesRadio.svelte';
    import {
        ROUTINES_PLACEHOLDER_NAME,
        ROUTINES_PLACEHOLDER_NOTES,
        ROUTINES_UNDO_NAME,
        ROUTINES_UNDO_NOTES,
    } from '@lib/constants/settings';

    export let rowView: IDbRowView<Routine>;
    export let payload: FocusPayloadRoutine;

    const NOTES_PLACEHOLDER: string = '';
</script>

<h2>Routine</h2>
<p>
    <sup>ID</sup>
    <InspectorFieldId {rowView} />
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
    <DefaultRoutinesRadio {rowView} />
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
