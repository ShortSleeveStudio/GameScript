<script lang="ts">
    import { Column, Row } from 'carbon-components-svelte';
    import { isApplyingDefaultPropertiesActors } from '@lib/stores/app/applying-default-properties';
    import { TABLE_ID_ACTORS } from '@lib/api/db/db-schema';
    import {
        ACTORS_DEFAULT_PROPERTY_PLACEHOLDER_NAME,
        ACTORS_DEFAULT_PROPERTY_UNDO_NAME,
        ACTORS_DEFAULT_PROPERTY_UNDO_TYPE,
    } from '@lib/constants/settings';
    import { actorDefaultProperties } from '@lib/tables/default-properties-actors';
    import SettingsDefaultProperties from './SettingsDefaultProperties.svelte';
    const tableTitle = 'Default Properties for Actors';

    const tableDescription = `Properties are a way to add arbirary data to new actors.
                              The properties in this table will appear in all new actors. You can
                              also apply these properties across pre-existing actors with the scary
                              red button.`;
    const modalText = `This will go through all actors and ensure every property exists.
                       Any previous property that no longer exist will be removed.
                       It's best to do this when no one else is actively editing actors.`;
</script>

<Row>
    <Column>
        <h2>Actors</h2>
        <p>
            <SettingsDefaultProperties
                defaultProperties={actorDefaultProperties}
                isApplyingDefaultProperties={isApplyingDefaultPropertiesActors}
                parentType={TABLE_ID_ACTORS}
                {tableTitle}
                {tableDescription}
                nameUndoText={ACTORS_DEFAULT_PROPERTY_UNDO_NAME}
                typeUndoText={ACTORS_DEFAULT_PROPERTY_UNDO_TYPE}
                namePlaceholderText={ACTORS_DEFAULT_PROPERTY_PLACEHOLDER_NAME}
                {modalText}
            />
        </p>
    </Column>
</Row>
