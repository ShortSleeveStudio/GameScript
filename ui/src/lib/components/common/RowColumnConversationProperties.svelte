<script lang="ts">
    /**
     * Custom properties editor for conversations.
     *
     * Thin wrapper around RowColumnEntityProperties configured for conversations.
     */
    import type { Row } from '@gamescript/shared';
    import { TABLE_CONVERSATIONS, TABLE_CONVERSATION_PROPERTIES } from '@gamescript/shared';
    import type { IDbRowView } from '$lib/db';
    import { conversationProperties } from '$lib/crud';
    import RowColumnEntityProperties from './RowColumnEntityProperties.svelte';

    interface Props {
        rowView: IDbRowView<Row>;
    }

    let { rowView }: Props = $props();
</script>

<RowColumnEntityProperties
    {rowView}
    entityTableRef={TABLE_CONVERSATIONS}
    propertiesTableRef={TABLE_CONVERSATION_PROPERTIES}
    propertyCrud={conversationProperties}
/>
