<script lang="ts">
    /**
     * Code Folder Selector Component.
     *
     * A reusable component for selecting and displaying the code output folder path.
     * Shows loading state, unconfigured warning, or current path with change button.
     *
     * Used by:
     * - InspectorNode.svelte (in the code section)
     * - SettingsPanel.svelte (in project settings)
     */
    import { Button } from '$lib/components/common';
    import { codeOutputFolderTableView, getCodeOutputFolder } from '$lib/tables';
    import { codeOutputFolder as codeOutputFolderCrud } from '$lib/crud';
    import { bridge } from '$lib/api/bridge';
    import { toastError } from '$lib/stores/notifications.js';

    interface Props {
        /** Optional label to show before the path. Defaults to "Code location:" */
        label?: string;
        /** Whether to show the warning state when not configured. Defaults to true. */
        showWarning?: boolean;
        /** Custom warning text when folder is not configured. */
        warningText?: string;
    }

    let {
        label = 'Code location:',
        showWarning = true,
        warningText = 'Select a folder where code files will be generated.',
    }: Props = $props();

    // Reactive state from the shared table view
    let codeOutputFolderView = $derived(getCodeOutputFolder(codeOutputFolderTableView.rows));
    let codeOutputFolderValue = $derived(codeOutputFolderView?.data.value ?? null);
    let isFolderConfigured = $derived(
        codeOutputFolderValue !== null && codeOutputFolderValue.trim() !== ''
    );
    let isInitialized = $derived(codeOutputFolderTableView.isInitialized);

    /**
     * Open folder picker and save the selected folder.
     */
    async function handleSelectFolder(): Promise<void> {
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

{#if !isInitialized}
    <div class="code-folder-config">
        <span class="code-folder-loading">Loading...</span>
    </div>
{:else if !isFolderConfigured && showWarning}
    <div class="code-folder-warning">
        <span class="code-folder-warning-text">{warningText}</span>
        <Button variant="primary" size="small" onclick={handleSelectFolder}>
            Select Folder
        </Button>
    </div>
{:else if !isFolderConfigured}
    <div class="code-folder-config">
        <span class="code-folder-label">Not configured</span>
        <Button variant="primary" size="small" onclick={handleSelectFolder}>
            Select Folder
        </Button>
    </div>
{:else}
    <div class="code-folder-config">
        <span class="code-folder-label">{label}</span>
        <span class="code-folder-path" title={codeOutputFolderValue ?? ''}>
            {codeOutputFolderValue}
        </span>
        <Button variant="ghost" size="small" onclick={handleSelectFolder} title="Change code location">
            Change
        </Button>
    </div>
{/if}

<style>
    .code-folder-config {
        display: flex;
        align-items: center;
        gap: 0.5rem;
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
