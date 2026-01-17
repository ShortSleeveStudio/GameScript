<script lang="ts">
    /**
     * Component for displaying and managing a code method (condition or action).
     *
     * Features:
     * - Toggle button to enable/disable the method (no optimistic updates)
     * - Read-only code preview when enabled
     * - "Open in IDE" button to jump to the method
     * - Handles creation (stub) and deletion (with diff preview)
     * - Full undo/redo support including code file restoration
     *
     * Used by InspectorNode for conditions and actions.
     * The parent component (InspectorNode) handles folder configuration.
     */
    import { type IDbRowView } from '$lib/db';
    import { type Node, type CodeTemplateType, getMethodNameForTemplate } from '@gamescript/shared';
    import { bridge } from '$lib/api/bridge';
    import { toastError } from '$lib/stores/notifications.js';
    import { codeTemplateTableView, getCodeTemplate } from '$lib/tables';
    import * as codeMethods from '$lib/crud/crud-code-methods';
    import { onDestroy } from 'svelte';
    import Button from './Button.svelte';
    import CodeMethodToggle from './CodeMethodToggle.svelte';

    // Get the current code template from the settings
    let codeTemplateView = $derived(getCodeTemplate(codeTemplateTableView.rows));
    let codeTemplate = $derived((codeTemplateView?.data.value as CodeTemplateType) ?? 'unity');

    interface Props {
        /** The row view for the node */
        rowView: IDbRowView<Node>;
        /** Column name for the boolean flag (e.g., 'has_condition', 'has_action') */
        columnName: 'has_condition' | 'has_action';
        /** Undo text for the operation */
        undoText: string;
        /** Type of method: 'condition' or 'action' */
        methodType: 'condition' | 'action';
        /** The conversation ID (needed for file operations) */
        conversationId: number;
        /** Whether the code output folder is configured (passed from parent) */
        isFolderConfigured: boolean;
    }

    let { rowView, columnName, undoText, methodType, conversationId, isFolderConfigured }: Props = $props();

    // Track pending state for toggle button
    let isPending = $state(false);

    // Computed method name based on node ID and template type
    let methodName = $derived(
        getMethodNameForTemplate(rowView.id, methodType, codeTemplate)
    );

    // Track enabled state from row data (source of truth)
    let hasMethod = $derived(Boolean(rowView.data[columnName]));

    // Code preview state
    let codePreview = $state<string | null>(null);
    let previewError = $state<string | null>(null);
    let isLoadingPreview = $state(false);

    // Subscribe to code file changes
    let unsubscribe: (() => void) | undefined = bridge.on('codeFileChanged', (event) => {
        if (event.conversationId === conversationId && hasMethod) {
            loadPreview();
        }
    });

    onDestroy(() => {
        unsubscribe?.();
    });

    // Load preview when method is enabled
    $effect(() => {
        if (hasMethod) {
            loadPreview();
        } else {
            codePreview = null;
            previewError = null;
        }
    });

    async function loadPreview(): Promise<void> {
        if (!bridge.isIde) {
            codePreview = '// Preview not available in standalone mode';
            return;
        }

        isLoadingPreview = true;
        previewError = null;

        try {
            const result = await bridge.getMethodBody(conversationId, methodName, codeTemplate);
            codePreview = result.body;
        } catch (error) {
            previewError = error instanceof Error ? error.message : 'Failed to load preview';
            codePreview = null;
        } finally {
            isLoadingPreview = false;
        }
    }

    async function handleEnable(): Promise<void> {
        isPending = true;
        try {
            await codeMethods.enableMethod({
                node: rowView.data,
                conversationId,
                methodName,
                methodType,
                codeTemplate,
                undoDescription: `${undoText} enabled`,
            });
        } catch (error) {
            toastError('Failed to create method', error);
        } finally {
            isPending = false;
        }
    }

    async function handleDisable(): Promise<void> {
        isPending = true;
        try {
            // Capture the current method code for undo (including attributes)
            let capturedCode = '';
            try {
                const methodResult = await bridge.getMethodBody(conversationId, methodName, codeTemplate);
                // Use fullText which includes the attribute, not just the body
                capturedCode = methodResult.fullText || methodResult.body || '';
            } catch {
                // Method might not exist yet, that's ok
            }

            // Show confirmation dialog and delete if accepted
            const result = await bridge.deleteMethod(conversationId, methodName, codeTemplate);

            if (result.accepted) {
                // User accepted deletion - update database with undo support
                await codeMethods.disableMethod({
                    node: rowView.data,
                    conversationId,
                    methodName,
                    methodType,
                    codeTemplate,
                    capturedCode,
                    undoDescription: `${undoText} disabled`,
                });
            }
            // If rejected, nothing changes - hasMethod stays true
        } catch (error) {
            toastError('Failed to delete method', error);
        } finally {
            isPending = false;
        }
    }

    function openInIDE(): void {
        bridge.openMethod(conversationId, methodName, codeTemplate);
    }
</script>

<div class="code-method">
    <div class="header">
        <CodeMethodToggle
            enabled={hasMethod}
            disabled={!isFolderConfigured}
            pending={isPending}
            onEnable={handleEnable}
            onDisable={handleDisable}
        />

        {#if hasMethod}
            <Button
                variant="ghost"
                size="small"
                onclick={openInIDE}
                disabled={isPending}
                title="Open in IDE"
            >
                Open
            </Button>
        {/if}
    </div>

    {#if hasMethod}
        <div class="preview">
            {#if isLoadingPreview}
                <div class="loading">Loading preview...</div>
            {:else if previewError}
                <div class="error">{previewError}</div>
            {:else if codePreview}
                <pre><code>{codePreview}</code></pre>
            {:else}
                <div class="empty">No code yet</div>
            {/if}
        </div>
    {/if}
</div>

<style>
    .code-method {
        margin-bottom: 0.75rem;
    }

    .header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 0.5rem;
    }

    .preview {
        margin-top: 0.5rem;
        padding: 0.5rem;
        background: var(--gs-bg-secondary);
        border: 1px solid var(--gs-border-primary);
        border-radius: 3px;
        max-height: 150px;
        overflow: auto;
    }

    .preview pre {
        margin: 0;
        font-family: 'Consolas', 'Monaco', monospace;
        font-size: 0.75rem;
        line-height: 1.4;
        white-space: pre-wrap;
        word-break: break-word;
    }

    .preview code {
        color: var(--gs-fg-primary);
    }

    .loading, .error, .empty {
        font-size: 0.75rem;
        color: var(--gs-fg-secondary);
        font-style: italic;
    }

    .error {
        color: var(--gs-fg-error, #f44336);
    }
</style>
