<script lang="ts">
    import {
        graphLayoutAutoLayoutDefault,
        graphLayoutVerticalDefault,
    } from '@lib/stores/graph/graph-layout';
    import { Tooltip } from 'carbon-components-svelte';
    import PersistedDropdown from '../common/PersistedDropdown.svelte';
    import {
        CONVERSATION_UNDO_DEFAULT_AUTO_LAYOUT,
        CONVERSATION_UNDO_DEFAULT_ORIENTATION,
    } from '@lib/constants/settings';
</script>

<p>
    <Tooltip triggerText="Default Graph Orientation">
        <p>
            Conversation graphs can be oriented vertically or horizontally. This setting dictates
            the default orientation for new conversations you create. This will only affect new
            conversations created locally.
        </p>
    </Tooltip>
    <PersistedDropdown
        store={graphLayoutVerticalDefault}
        undoText={CONVERSATION_UNDO_DEFAULT_ORIENTATION}
        dropdownItems={[
            { id: false, text: 'Horizontal' },
            { id: true, text: 'Vertical' },
        ]}
    />
</p>
<p>
    <Tooltip triggerText="Default Graph Auto-Layout">
        <p>
            Conversation graphs can be organized automatically or manually by toggling the
            auto-layout functionality. This settings dictactes the default state of the auto-layout
            toggle for new conversations you create. This will only affect new conversations created
            locally.
        </p>
    </Tooltip>
    <PersistedDropdown
        store={graphLayoutAutoLayoutDefault}
        undoText={CONVERSATION_UNDO_DEFAULT_AUTO_LAYOUT}
        dropdownItems={[
            { id: false, text: 'Disabled' },
            { id: true, text: 'Enabled' },
        ]}
    />
</p>
