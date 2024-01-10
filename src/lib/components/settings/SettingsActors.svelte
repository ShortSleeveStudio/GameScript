<script lang="ts">
    import { Column, Row } from 'carbon-components-svelte';
    import { isApplyingDefaultFieldsActors } from '@lib/stores/app/applying-default-fields';
    import { TABLE_ID_ACTORS } from '@lib/api/db/db-schema';
    import {
        ACTORS_DEFAULT_FIELDS_PLACEHOLDER_NAME,
        ACTORS_DEFAULT_FIELDS_UNDO_NAME,
        ACTORS_DEFAULT_FIELDS_UNDO_TYPE,
    } from '@lib/constants/settings';
    import { actorDefaultFields } from '@lib/tables/default-fields-actors';
    import SettingsDefaultFields from './SettingsDefaultFields.svelte';
    const tableTitle = 'Actor Custom Properties';
    const tableDescription = `These properties will appear in all new actors. You can also apply
                              these properties across pre-existing actors with the scary red
                              button.`;
    const modalText = `This will go through all actors and ensure every default fields exists.
                       Any previous default fields that no longer exist will be removed. It's best
                       to do this when no one else is actively editing actors.`;
</script>

<Row>
    <Column>
        <h2>Actors</h2>
        <p>
            <SettingsDefaultFields
                defaultFields={actorDefaultFields}
                isApplyingDefaultFields={isApplyingDefaultFieldsActors}
                parentType={TABLE_ID_ACTORS}
                {tableTitle}
                {tableDescription}
                nameUndoText={ACTORS_DEFAULT_FIELDS_UNDO_NAME}
                typeUndoText={ACTORS_DEFAULT_FIELDS_UNDO_TYPE}
                namePlaceholderText={ACTORS_DEFAULT_FIELDS_PLACEHOLDER_NAME}
                {modalText}
            />
        </p>
    </Column>
</Row>
