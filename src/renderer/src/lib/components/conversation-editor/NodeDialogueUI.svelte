<script lang="ts">
    import type { Localization } from '@common/common-schema';

    import RowColumnTextArea from '../common/RowColumnTextArea.svelte';
    import type { IDbRowView } from '@lib/api/db/db-view-row-interface';
    import { NODE_PLACEHOLDER_UI_TEXT, NODE_UNDO_UI_TEXT } from '@lib/constants/settings';
    import { getLocalePrincipal, localePrincipalTableView } from '@lib/tables/locale-principal';
    import { localeIdToColumn } from '@common/common-locale';

    export let localization: IDbRowView<Localization>;
    export let disabled: boolean = false;

    let localeColumn: string;
    $: primaryLocale = getLocalePrincipal($localePrincipalTableView);
    $: {
        if (primaryLocale) localeColumn = localeIdToColumn($primaryLocale.principal);
    }
</script>

{#if primaryLocale}
    <RowColumnTextArea
        class="nodrag nopan node-text-ui"
        stopDefault={true}
        disableBorder={true}
        {disabled}
        resizable={false}
        rowView={localization}
        columnName={localeColumn}
        undoText={NODE_UNDO_UI_TEXT}
        placeholder={NODE_PLACEHOLDER_UI_TEXT}
    />
{/if}
