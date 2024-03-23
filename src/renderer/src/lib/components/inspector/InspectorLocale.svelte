<script lang="ts">
    import { type Locale } from '@common/common-schema';
    import type { IDbRowView } from '@lib/api/db/db-view-row-interface';
    import type { FocusPayloadLocale } from '@lib/stores/app/focus';
    import RowColumnId from '../common/RowColumnId.svelte';
    import RowNameInput from '../common/RowNameInput.svelte';
    import {
        LOCALE_PLACEHOLDER_NAME,
        LOCALE_UNDO_NAME,
        LOCALE_UNDO_PRIMARY,
    } from '@lib/constants/settings';
    import RowColumnRadio from '../common/RowColumnRadio.svelte';
    import RowColumnLocalization from '../common/RowColumnLocalization.svelte';

    export let rowView: IDbRowView<Locale>;
    export let payload: FocusPayloadLocale;
</script>

<h2>Locale</h2>
<p>
    <sup>ID</sup>
    <RowColumnId {rowView} />
</p>
<p>
    <sup>Name</sup>
    <RowNameInput
        {rowView}
        undoText={LOCALE_UNDO_NAME}
        inputPlaceholder={LOCALE_PLACEHOLDER_NAME}
        uniqueNameTracker={payload.uniqueNameTracker}
        isInspectorField={true}
    />
</p>
<p>
    <sup>Primary</sup>
    <RowColumnRadio
        {rowView}
        undoText={LOCALE_UNDO_PRIMARY}
        principalStore={payload.localePrincipalRowView}
    />
</p>
<p>
    <sup>Localized Name</sup>
    <RowColumnLocalization {rowView} columnName={'localized_name'} />
</p>
