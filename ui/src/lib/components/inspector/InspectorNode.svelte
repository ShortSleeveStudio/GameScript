<script lang="ts">
    /**
     * Inspector panel for Node rows.
     *
     * Displays properties of a selected dialogue node:
     * - ID, Type, Conversation ID (read-only)
     * - Actor selection
     * - Voice text / UI response text (localization references with inline editing)
     * - Code folder configuration (shared by condition and action)
     * - Condition (code method with preview)
     * - Action (code method with preview)
     * - Prevent response flag
     * - Custom properties (if property templates exist)
     *
     * Ported from GameScriptElectron, updated for v2 code-in-IDE approach.
     */
    import type { Row } from '@gamescript/shared';
    import type { IDbRowView } from '$lib/db';
    import {
        RowColumnId,
        RowColumnBoolean,
        CodeMethod,
        InspectorField,
        Button,
    } from '$lib/components/common';
    import RowColumnActor from '$lib/components/common/RowColumnActor.svelte';
    import RowColumnLocalization from '$lib/components/common/RowColumnLocalization.svelte';
    import RowColumnProperties from '$lib/components/common/RowColumnProperties.svelte';
    import { propertyTemplatesTable } from '$lib/tables/property-templates.js';
    import { codeOutputFolderTableView, getCodeOutputFolder } from '$lib/tables';
    import { codeOutputFolder as codeOutputFolderCrud } from '$lib/crud';
    import { bridge } from '$lib/api/bridge';
    import { toastError } from '$lib/stores/notifications.js';
    import {
        NODE_UNDO_PREVENT_RESPONSE,
        NODE_UNDO_HAS_CONDITION,
        NODE_UNDO_HAS_ACTION,
    } from '$lib/constants/settings';

    interface Props {
        rowView: IDbRowView<Row>;
    }

    let { rowView }: Props = $props();

    // Computed display values - cast to access Node-specific fields
    let nodeType = $derived((rowView.data as { type?: string }).type === 'root' ? 'Root' : 'Dialogue');
    let isRoot = $derived((rowView.data as { type?: string }).type === 'root');
    let conversationId = $derived((rowView.data as { parent?: number }).parent ?? 0);

    // Check if we have property templates
    let hasPropertyTemplates = $derived(propertyTemplatesTable && propertyTemplatesTable.rows.length > 0);

    // Code output folder from reactive store
    let codeOutputFolderView = $derived(getCodeOutputFolder(codeOutputFolderTableView.rows));
    let codeOutputFolderValue = $derived(codeOutputFolderView?.data.value ?? null);
    let isFolderConfigured = $derived(
        codeOutputFolderValue !== null && codeOutputFolderValue.trim() !== ''
    );

    /**
     * Open folder picker and save the selected folder.
     */
    async function configureCodeFolder(): Promise<void> {
        try {
            const result = await bridge.selectFolderDialog('Select Code Output Folder');
            if (result.cancelled || !result.filePath) {
                return;
            }
            await codeOutputFolderCrud.setCodeOutputFolder(result.filePath);
        } catch (error) {
            toastError('Failed to configure code folder', error);
        }
    }
</script>

<h2>{nodeType} Node</h2>

<InspectorField label="ID">
    <RowColumnId {rowView} />
</InspectorField>

<InspectorField label="Conversation ID">
    <RowColumnId {rowView} columnName={'parent'} />
</InspectorField>

<InspectorField label="Type">
    <RowColumnId {rowView} columnName={'type'} />
</InspectorField>

{#if !isRoot}
    <InspectorField label="Actor">
        <RowColumnActor {rowView} columnName={'actor'} />
    </InspectorField>

    <InspectorField
        label="Voice Text"
        tooltip="This is the localized text for the line that is spoken when this node plays during a conversation."
    >
        <RowColumnLocalization
            {rowView}
            columnName={'voice_text'}
            showTitle={false}
            showId={false}
            showNickname={false}
        />
    </InspectorField>

    <InspectorField
        label="UI Response Text"
        tooltip="In most games, the player is presented with a list of dialogue options they can select in response during a conversation. This localized text can be used for the UI element responsible for presenting the player with response options."
    >
        <RowColumnLocalization
            {rowView}
            columnName={'ui_response_text'}
            showTitle={false}
            showId={false}
            showNickname={false}
        />
    </InspectorField>

    <div class="code-section">
        <div class="code-section-header">Code</div>
        <p class="code-section-description">
            Conditions control whether this node is available. Actions run when the node plays.
        </p>

        {#if codeOutputFolderTableView.isLoading}
            <div class="code-folder-config">
                <span class="code-folder-loading">Loading...</span>
            </div>
        {:else if !isFolderConfigured}
            <div class="code-folder-warning">
                <span class="code-folder-warning-text">Select a folder where code files will be generated.</span>
                <Button variant="primary" size="small" onclick={configureCodeFolder}>
                    Select Folder
                </Button>
            </div>
        {:else}
            <div class="code-folder-config">
                <span class="code-folder-label">Code location:</span>
                <span class="code-folder-path" title={codeOutputFolderValue ?? ''}>
                    {codeOutputFolderValue}
                </span>
                <Button variant="ghost" size="small" onclick={configureCodeFolder} title="Change code location">
                    Change
                </Button>
            </div>

            <InspectorField
                label="Condition"
                tooltip="A function that returns true if this node should be available, or false to hide it."
            >
                <CodeMethod
                    {rowView}
                    columnName="has_condition"
                    undoText={NODE_UNDO_HAS_CONDITION}
                    methodType="condition"
                    {conversationId}
                    {isFolderConfigured}
                />
            </InspectorField>

            <InspectorField
                label="Action"
                tooltip="A function that runs when this node plays. Use it to trigger game events, animations, sounds, etc."
            >
                <CodeMethod
                    {rowView}
                    columnName="has_action"
                    undoText={NODE_UNDO_HAS_ACTION}
                    methodType="action"
                    {conversationId}
                    {isFolderConfigured}
                />
            </InspectorField>
        {/if}
    </div>

    <InspectorField
        label="Prevent Response"
        tooltip="This setting will prevent this node's children from appearing as response options. If all children are available, then GameScript will select the child with the highest priority edge. If all edge priorities are the same, then a node will be selected at random."
    >
        <RowColumnBoolean
            {rowView}
            columnName={'is_prevent_response'}
            undoText={NODE_UNDO_PREVENT_RESPONSE}
            label="Enabled"
        />
    </InspectorField>

    {#if hasPropertyTemplates}
        <InspectorField
            label="Custom Properties"
            tooltip="Custom properties allow you to attach arbitrary data to specific nodes."
        >
            <RowColumnProperties {rowView} />
        </InspectorField>
    {/if}
{/if}

<style>
    h2 {
        margin: 0 0 1rem 0;
        font-size: 1.125rem;
        font-weight: 600;
        color: var(--gs-fg-primary);
    }

    .code-section {
        margin: 1rem 0;
        padding: 0.75rem;
        background: var(--gs-bg-secondary);
        border: 1px solid var(--gs-border-primary);
        border-radius: 4px;
    }

    .code-section-header {
        font-size: 0.875rem;
        font-weight: 600;
        color: var(--gs-fg-primary);
        margin-bottom: 0.25rem;
    }

    .code-section-description {
        font-size: 0.75rem;
        color: var(--gs-fg-secondary);
        margin: 0 0 0.75rem 0;
        line-height: 1.4;
    }

    .code-folder-config {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        margin-bottom: 0.75rem;
        padding: 0.5rem;
        background: var(--gs-bg-tertiary);
        border: 1px solid var(--gs-border-primary);
        border-radius: 3px;
    }

    .code-folder-warning {
        display: flex;
        flex-direction: column;
        align-items: flex-start;
        gap: 0.5rem;
        padding: 0.75rem;
        background: var(--gs-bg-tertiary);
        border: 1px solid var(--gs-border-warning, var(--gs-border-primary));
        border-radius: 3px;
    }

    .code-folder-warning-text {
        font-size: 0.8rem;
        color: var(--gs-fg-secondary);
    }

    .code-folder-label {
        font-size: 0.75rem;
        color: var(--gs-fg-secondary);
        flex-shrink: 0;
    }

    .code-folder-loading {
        font-size: 0.8rem;
        color: var(--gs-fg-secondary);
        font-style: italic;
    }

    .code-folder-path {
        font-size: 0.75rem;
        color: var(--gs-fg-primary);
        font-family: var(--gs-font-mono, monospace);
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
        flex: 1;
        min-width: 0;
    }
</style>
