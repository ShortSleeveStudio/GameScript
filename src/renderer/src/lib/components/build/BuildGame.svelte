<script lang="ts">
    import { Tooltip } from 'carbon-components-svelte';
</script>

<h2>Game</h2>
<p>
    <Tooltip triggerText="Data Export Location" align="start" direction="bottom">
        <p>
            {window.api.constants.APP_NAME} exports all localization and conversation graph data to a
            single compressed file that is used by the {window.api.constants.APP_NAME} engine modules
            at runtime. This setting dictates which folder the data file will be exported to.
        </p>
    </Tooltip>
</p>
<p>
    <Tooltip triggerText="Routine Export Location" align="start" direction="bottom">
        <p>
            {window.api.constants.APP_NAME} transpiles all routines to the language of your choosing
            and then exports all generated code this directory.
        </p>
    </Tooltip>
</p>
