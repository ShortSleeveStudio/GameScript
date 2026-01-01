/**
 * Graph editor component exports.
 *
 * @example
 * ```svelte
 * <script>
 *   import { Graph } from '$lib/components/graph';
 * </script>
 *
 * <Graph conversationId={selectedConversationId} />
 * ```
 */

// Main component
export { default as Graph } from './Graph.svelte';

// Node components
export { default as NodeRoot } from './nodes/NodeRoot.svelte';
export { default as NodeDialogue } from './nodes/NodeDialogue.svelte';
export { default as NodeBase } from './nodes/NodeBase.svelte';

// Edge components
export { default as EdgeDefault } from './edges/EdgeDefault.svelte';
export { default as EdgeHidden } from './edges/EdgeHidden.svelte';

// Types and utilities
export * from './utils/types.js';
export * from './utils/validation.js';
