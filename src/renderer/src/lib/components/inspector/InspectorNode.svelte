<script lang="ts">
    import {
        TABLE_ID_ROUTINES,
        type Node,
        type Routine,
        NODE_TYPE_DIALOGUE,
    } from '@lib/api/db/db-schema';
    import type { IDbRowView } from '@lib/api/db/db-view-row-interface';
    import RowColumnId from '../common/RowColumnId.svelte';
    import RowColumnLocalization from '../common/RowColumnLocalization.svelte';
    import RoutineEditor from '../common/RoutineEditor.svelte';
    import RoutineSelector from '../common/RoutineSelector.svelte';
    import { onDestroy, onMount } from 'svelte';
    import { createFilter } from '@lib/api/db/db-filter';
    import { get } from 'svelte/store';
    import { db } from '@lib/api/db/db';
    import type { IDbTableView } from '@lib/api/db/db-view-table-interface';
    import { Tooltip } from 'carbon-components-svelte';
    import RowColumnActor from '../common/RowColumnActor.svelte';
    import RowColumnBoolean from '../common/RowColumnBoolean.svelte';
    import { NODE_UNDO_PREVENT_RESPONSE } from '@lib/constants/settings';

    export let rowView: IDbRowView<Node>;
    let routineTable: IDbTableView<Routine>;
    let routineCode: IDbRowView<Routine>;
    let routineCondition: IDbRowView<Routine>;
    $: {
        const rowViews: IDbRowView<Routine>[] = $routineTable;
        if (rowViews) {
            const codeRoutineId: number = get(rowView).code;
            for (let i = 0; i < rowViews.length; i++) {
                const routineRowView: IDbRowView<Routine> = rowViews[i];
                const routineId: number = routineRowView.id;
                if (routineId === codeRoutineId) {
                    routineCode = routineRowView;
                } else {
                    routineCondition = routineRowView;
                }
            }
        }
    }

    onMount(() => {
        const routineIds: number[] = [get(rowView).code, get(rowView).condition];
        routineTable = db.fetchTable<Routine>(
            TABLE_ID_ROUTINES,
            createFilter().where().column('id').in(routineIds).endWhere().build(),
        );
    });
    onDestroy(() => {
        if (routineTable) db.releaseTable(routineTable);
    });
</script>

<h2>Node</h2>
<p>
    <sup>ID</sup>
    <RowColumnId {rowView} />
</p>
<p>
    <sup>Conversation ID</sup>
    <RowColumnId {rowView} columnName={'parent'} />
</p>
{#if $rowView.type === NODE_TYPE_DIALOGUE}
    <p>
        <sup>Actor</sup>
        <RowColumnActor {rowView} columnName={'actor'} />
    </p>
    <p>
        <Tooltip triggerText="Voice Text" align="start" direction="bottom">
            <p>
                This is the localized text for the line that is spoken when this node plays during a
                conversation.
            </p>
        </Tooltip>
        <RowColumnLocalization
            {rowView}
            columnName={'voiceText'}
            showTitle={false}
            showId={false}
            showNickname={false}
        />
    </p>
    <p>
        <Tooltip triggerText="UI Response Text" align="start" direction="bottom">
            <p>
                In most games, the player is presented with a list of dialogue options they can
                select in response during a conversation. This localized text can be used for the UI
                element responsible for presenting the player with response options.
            </p>
        </Tooltip>
        <RowColumnLocalization
            {rowView}
            columnName={'uiResponseText'}
            showTitle={false}
            showId={false}
            showNickname={false}
        />
    </p>
    <p>
        <Tooltip triggerText="Condition" align="start" direction="bottom">
            <p>
                This routine must return a boolean value representing whether this node is unlocked.
            </p>
        </Tooltip>
        <RoutineEditor rowView={routineCondition} columnName={'code'} />
    </p>
    <p>
        <Tooltip triggerText="Code" align="start" direction="bottom">
            <p>
                The following routine will execute as soon as this node plays during a conversation.
                You can use it to do anything you want (eg. moving a player, play a sound, etc).
                Also, with the dropdown below, you may select from a list of default routines you
                can create in the settings menu.
            </p>
        </Tooltip>
        <RoutineSelector
            {rowView}
            columnNameOverrideRoutine={'codeOverride'}
            defaultRoutine={routineCode}
        />
    </p>
    <p>
        <Tooltip triggerText="Prevent Response" align="center" direction="top">
            <p>
                This setting will prevent this node's children from appearing as response options.
                If all children are available, then {window.api.constants.APP_NAME} will select the child
                with the highest priority edge. If all edge priorities are the same, then a node will
                be selected at random.
            </p>
        </Tooltip>
        <RowColumnBoolean
            {rowView}
            columnName={'preventResponse'}
            undoText={NODE_UNDO_PREVENT_RESPONSE}
        />
    </p>
{/if}
