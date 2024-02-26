<script lang="ts">
    import type { Localization } from '@common/common-schema';

    import RowColumnTextArea from '../common/RowColumnTextArea.svelte';
    import type { IDbRowView } from '@lib/api/db/db-view-row-interface';
    import { NODE_PLACEHOLDER_VOICE_TEXT, NODE_UNDO_VOICE_TEXT } from '@lib/constants/settings';
    import { getLocalePrincipal, localePrincipalTableView } from '@lib/tables/locale-principal';
    import { localeIdToColumn } from '@common/common-locale';

    export let localization: IDbRowView<Localization>;
    export let disabled: boolean = false;
    $: primaryLocale = getLocalePrincipal($localePrincipalTableView);
    $: localeColumn = localeIdToColumn($primaryLocale.principal);
</script>

<RowColumnTextArea
    class="nodrag nopan node-text"
    stopDefault={true}
    disableBorder={true}
    {disabled}
    resizable={false}
    rowView={localization}
    columnName={localeColumn}
    undoText={NODE_UNDO_VOICE_TEXT}
    placeholder={NODE_PLACEHOLDER_VOICE_TEXT}
/>
