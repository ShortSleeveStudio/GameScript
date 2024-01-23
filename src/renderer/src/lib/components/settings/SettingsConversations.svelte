<script lang="ts">
    // TODO - consider deleting
    import { Column, Row } from 'carbon-components-svelte';
    import { isApplyingDefaultPropertiesConversations } from '@lib/stores/app/applying-default-properties';
    import { TABLE_ID_CONVERSATIONS } from '@lib/api/db/db-schema';
    import { conversationDefaultProperties } from '@lib/tables/default-properties-conversations';
    import {
        CONVERSATIONS_DEFAULT_PROPERTY_PLACEHOLDER_NAME,
        CONVERSATIONS_DEFAULT_PROPERTY_UNDO_NAME,
        CONVERSATIONS_DEFAULT_PROPERTY_UNDO_TYPE,
    } from '@lib/constants/settings';
    import SettingsDefaultProperties from './SettingsDefaultProperties.svelte';

    const tableTitle = 'Default Properties for Conversations';
    const tableDescription = `Properties are a way to add arbirary data to new conversation nodes. 
                              The properties in this table will appear in all new conversation
                              nodes. You can also apply these properties across pre-existing nodes
                              with the scary red button.`;
    const modalText = `This will go through every conversation node and ensure every property
                       exists. Any previous property that no longer exist will be removed.
                       It's best to do this when no one else is actively editing dialogue.`;
</script>

<Row>
    <Column>
        <h2>Conversation Editor</h2>
        <p>
            <SettingsDefaultProperties
                defaultProperties={conversationDefaultProperties}
                isApplyingDefaultProperties={isApplyingDefaultPropertiesConversations}
                parentType={TABLE_ID_CONVERSATIONS}
                {tableTitle}
                {tableDescription}
                nameUndoText={CONVERSATIONS_DEFAULT_PROPERTY_UNDO_NAME}
                typeUndoText={CONVERSATIONS_DEFAULT_PROPERTY_UNDO_TYPE}
                namePlaceholderText={CONVERSATIONS_DEFAULT_PROPERTY_PLACEHOLDER_NAME}
                {modalText}
            />
        </p>
    </Column>
</Row>
