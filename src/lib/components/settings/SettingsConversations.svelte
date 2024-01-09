<script lang="ts">
    import { Column, Row } from 'carbon-components-svelte';
    import { isApplyingDefaultFieldsConversations } from '@lib/stores/app/applying-default-fields';
    import { TABLE_ID_CONVERSATIONS } from '@lib/api/db/db-schema';
    import { conversationDefaultFields } from '@lib/tables/default-fields-conversations';
    import {
        CONVERSATIONS_DEFAULT_FIELDS_PLACEHOLDER_NAME,
        CONVERSATIONS_DEFAULT_FIELDS_UNDO_NAME,
        CONVERSATIONS_DEFAULT_FIELDS_UNDO_TYPE,
    } from '@lib/constants/settings';
    import SettingsDefaultFields from './SettingsDefaultFields.svelte';

    const tableTitle = 'Conversation Custom Properties';
    const tableDescription = `These properties will appear in all new conversation nodes. You can 
                              also apply these properties across pre-existing nodes with the scary 
                              red button.`;
    const modalText = `This will go through every conversation node and ensure every default fields 
                       exists. Any previous default fields that no longer exist will be removed. 
                       It's best to do this when no one else is actively editing dialogue.`;
</script>

<Row>
    <Column>
        <h2>Conversation Editor</h2>
        <SettingsDefaultFields
            defaultFields={conversationDefaultFields}
            isApplyingDefaultFields={isApplyingDefaultFieldsConversations}
            parentType={TABLE_ID_CONVERSATIONS}
            {tableTitle}
            {tableDescription}
            nameUndoText={CONVERSATIONS_DEFAULT_FIELDS_UNDO_NAME}
            typeUndoText={CONVERSATIONS_DEFAULT_FIELDS_UNDO_TYPE}
            namePlaceholderText={CONVERSATIONS_DEFAULT_FIELDS_PLACEHOLDER_NAME}
            {modalText}
        />
    </Column>
</Row>
