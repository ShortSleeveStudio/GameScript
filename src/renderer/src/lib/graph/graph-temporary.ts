import { useStore } from '@xyflow/svelte';
import type { NodeDimensionUpdate } from '@xyflow/system';
import { get } from 'svelte/store';

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

export function useHandleEdgeSelect(): (id: string) => void {
    const {
        edgeLookup,
        selectionRect,
        selectionRectMode,
        multiselectionKeyPressed,
        addSelectedEdges,
        unselectNodesAndEdges,
        elementsSelectable,
    } = useStore();

    return (id: string) => {
        const edge = get(edgeLookup).get(id);

        if (!edge) {
            console.warn('Edge was missing for edge select');
            return;
        }

        const selectable =
            edge.selectable || (get(elementsSelectable) && typeof edge.selectable === 'undefined');

        if (selectable) {
            selectionRect.set(null);
            selectionRectMode.set(null);

            if (!edge.selected) {
                addSelectedEdges([id]);
            } else if (edge.selected && get(multiselectionKeyPressed)) {
                unselectNodesAndEdges({ nodes: [], edges: [edge] });
            }
        }
    };
}
