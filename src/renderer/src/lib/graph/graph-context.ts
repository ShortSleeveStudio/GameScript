import type { Edge, Node } from '@lib/api/db/db-schema';

export interface GraphContext {
    onDelete: (nodes: Node[], edges: Edge[]) => Promise<void>;
}
