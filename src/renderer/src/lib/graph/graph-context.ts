import type { Edge, Node } from '@common/common-schema';

export interface GraphContext {
    onDelete: (nodes: Node[], edges: Edge[]) => Promise<void>;
}
