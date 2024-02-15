// import type { NodeDimensionUpdate } from '@lib/vendor/flow/system/src';
import type { NodeDimensionUpdate } from '@xyflow/system';

export async function updateNodeInternals(
    id: string | string[],
    domNode: HTMLDivElement,
    updateNodeDimensions: (updates: Map<string, NodeDimensionUpdate>) => void,
): Promise<void> {
    return new Promise((resolve) => {
        const updateIds = Array.isArray(id) ? id : [id];
        const updates = new Map();

        updateIds.forEach((updateId) => {
            const nodeElement = domNode.querySelector(
                `.svelte-flow__node[data-id="${updateId}"]`,
            ) as HTMLDivElement;

            if (nodeElement) {
                updates.set(updateId, { id: updateId, nodeElement, forceUpdate: true });
            }
        });

        requestAnimationFrame(() => {
            updateNodeDimensions(updates);
            resolve();
        });
    });
}
