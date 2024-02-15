<script lang="ts">
    import { Column, Row } from 'carbon-components-svelte';
    import SettingsConversationsFilters from './SettingsConversationsFilters.svelte';
    import SettingsConversationsLayout from './SettingsConversationsLayout.svelte';
</script>

<Row>
    <Column>
        <h2>Conversations</h2>
        <SettingsConversationsLayout />
        <SettingsConversationsFilters />
    </Column>
</Row>
