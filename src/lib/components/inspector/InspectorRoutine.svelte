<script lang="ts">
    import type { Routine } from '@lib/api/db/db-schema';
    import type { IDbRowView } from '@lib/api/db/db-view-row-interface';
    import type { FocusPayloadRoutine } from '@lib/stores/app/focus';
    import RowNameInput from '../common/RowNameInput.svelte';
    import InspectorFieldCode from './InspectorFieldCode.svelte';
    import InspectorFieldId from './InspectorFieldId.svelte';
    import InspectorFieldNotes from './InspectorFieldNotes.svelte';

    export let rowView: IDbRowView<Routine>;
    export let payload: FocusPayloadRoutine;

    const NOTES_PLACEHOLDER: string = 'Developer notes go here...';
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
        inputPlaceholder={payload.namePlaceholder}
        uniqueNameTracker={payload.uniqueNameTracker}
        isInspectorField={true}
    />
</p>
<p>
    <sup>Code</sup>
    <InspectorFieldCode {rowView} />
</p>
<p>
    <sup>Notes</sup>
    <InspectorFieldNotes {rowView} placeholder={NOTES_PLACEHOLDER} />
</p>
