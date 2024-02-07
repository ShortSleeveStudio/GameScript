<script lang="ts">
    import type { Localization } from '@lib/api/db/db-schema';

    import RowColumnTextArea from '../common/RowColumnTextArea.svelte';
    import type { IDbRowView } from '@lib/api/db/db-view-row-interface';
    import { NODE_PLACEHOLDER_VOICE_TEXT, NODE_UNDO_VOICE_TEXT } from '@lib/constants/settings';
    import { getLocalePrincipal, localePrincipalTableView } from '@lib/tables/locale-principal';
    import { localeIdToColumn } from '@lib/utility/locale';

    export let localization: IDbRowView<Localization>;
    export let disabled: boolean = false;
    $: primaryLocale = getLocalePrincipal($localePrincipalTableView);
    $: localeColumn = localeIdToColumn($primaryLocale.principal);
</script>

<RowColumnTextArea
    class="nodrag"
    {disabled}
    resizable={false}
    rowView={localization}
    columnName={localeColumn}
    undoText={NODE_UNDO_VOICE_TEXT}
    placeholder={NODE_PLACEHOLDER_VOICE_TEXT}
/>
