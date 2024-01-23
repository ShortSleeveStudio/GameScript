<script lang="ts">
    import { AUTO_COMPLETE_RULE_DROP_DOWN_ITEMS, type AutoComplete } from '@lib/api/db/db-schema';
    import type { IDbRowView } from '@lib/api/db/db-view-row-interface';
    import type { FocusPayloadAutoComplete } from '@lib/stores/app/focus';
    import RowColumnId from '../common/RowColumnId.svelte';
    import RowNameInput from '../common/RowNameInput.svelte';
    import {
        AUTO_COMPLETE_PLACEHOLDER_AUTO_COMPLETE,
        AUTO_COMPLETE_PLACEHOLDER_LABEL,
        AUTO_COMPLETE_UNDO_DOCUMENTATION,
        AUTO_COMPLETE_UNDO_LABEL,
        AUTO_COMPLETE_UNDO_RULE,
    } from '@lib/constants/settings';
    import RowColumnDropdown from '../common/RowColumnDropdown.svelte';
    import { Tooltip } from 'carbon-components-svelte';
    import RoutineEditor from '../common/RoutineEditor.svelte';
    import RowColumnTextArea from '../common/RowColumnTextArea.svelte';

    export let rowView: IDbRowView<AutoComplete>;
    export let payload: FocusPayloadAutoComplete;
</script>

<h2>Auto-Complete</h2>
<p>
    <sup>ID</sup>
    <RowColumnId {rowView} />
</p>
<p>
    <Tooltip triggerText="Label" align="start" direction="bottom">
        <p>
            Labels are what the editor looks for while you type in order to decide if it's time to
            provide a suggestion.
        </p>
    </Tooltip>
    <RowNameInput
        {rowView}
        undoText={AUTO_COMPLETE_UNDO_LABEL}
        inputPlaceholder={AUTO_COMPLETE_PLACEHOLDER_LABEL}
        uniqueNameTracker={payload.uniqueNameTracker}
        isInspectorField={true}
    />
</p>
<p>
    <Tooltip triggerText="Rule" align="start" direction="bottom">
        <b>None</b>
        <p>Text will be inserted exactly as you type it.</p>
        <br />
        <b>Insert as Snippet</b>
        <p>
            Snippets are templated strings that allow users to tab between parameters they need to
            fill in.
            <br />
            They take the form:
            <br />
            {'${<index>:<placeholder>}'}
            <br /><br />
            Here's an example:
            <br />
            {'WalkTo(${1:actor}, ${2:location});'}
        </p>
        <br />
        <b>Keep Whitespace</b>
        <p>
            The editor will adjust whitespace and indentation of multiline insert text to match the
            current line's indentation.
        </p>
    </Tooltip>
    <RowColumnDropdown
        {rowView}
        columnName={'rule'}
        undoText={AUTO_COMPLETE_UNDO_RULE}
        dropdownItems={AUTO_COMPLETE_RULE_DROP_DOWN_ITEMS}
    />
</p>
<p>
    <sup>Text to Insert</sup>
    <RoutineEditor {rowView} columnName={'insertion'} languageOverride={'plaintext'} />
</p>
<p>
    <sup>Documentation</sup>
    <RowColumnTextArea
        {rowView}
        undoText={AUTO_COMPLETE_UNDO_DOCUMENTATION}
        columnName={'documentation'}
        placeholder={AUTO_COMPLETE_PLACEHOLDER_AUTO_COMPLETE}
    />
</p>
