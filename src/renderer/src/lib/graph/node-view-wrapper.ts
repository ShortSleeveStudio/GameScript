import { type Node as FlowNode, type XYPosition } from '@xyflow/svelte';

class NodeViewWrapper implements FlowNode {
    id: string;
    position: XYPosition;
    data: any;
    // type?: string;
    // sourcePosition?: Position;
    // targetPosition?: Position;
    // hidden?: boolean;
    // selected?: boolean;
    // dragging?: boolean;
    // draggable?: boolean;
    // selectable?: boolean;
    // connectable?: boolean;
    // deletable?: boolean;
    // dragHandle?: string;
    // width?: number;
    // height?: number;
    // parentNode?: string;
    // zIndex?: number;
    // extent?: 'parent' | CoordinateExtent;
    // expandParent?: boolean;
    // ariaLabel?: string;
    // origin?: NodeOrigin;
    // handles?;
    // computed?: {
    //     width?: number; //     type: 'default',
    //     //     type: 'default',
    //     //     source: '1',
    //     //     target: '2',
    //     //     label: 'Edge Text',
    //     // },
    //     // {
    //     //     id: '2-3',
    //     //     type: 'smoothstep',
    //     //     source: '2',
    //     //     target: '3',
    //     //     label: 'Edge Text',
    //     // },
    //     height?: number; //     source: '1',
    //     //     source: '1',
    //     //     target: '2',
    //     //     label: 'Edge Text',
    //     // },
    //     // {
    //     //     id: '2-3',
    //     //     type: 'smoothstep',
    //     //     source: '2',
    //     //     target: '3',
    //     //     label: 'Edge Text',
    //     // },
    //     positionAbsolute?: XYPosition;
    // };
    // [internalsSymbol]?;
    // class?: string;
    // style?: string;
}
