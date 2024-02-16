import type { ElkEdgeSection, ElkExtendedEdge } from '@lib/vendor/elkjs/elk-api';
import { Position, type XYPosition } from '@xyflow/svelte';
// import { Position, type XYPosition } from '@lib/vendor/flow/svelte/src/lib';

export interface GetSmoothStepPathParams {
    sourceX: number;
    sourceY: number;
    sourcePosition?: Position;
    targetX: number;
    targetY: number;
    targetPosition?: Position;
    borderRadius?: number;
    centerX?: number;
    centerY?: number;
    offset?: number;
}

const distance = (a: XYPosition, b: XYPosition): number =>
    Math.sqrt(Math.pow(b.x - a.x, 2) + Math.pow(b.y - a.y, 2));

function getBend(a: XYPosition, b: XYPosition, c: XYPosition, size: number): string {
    const aToB: number = distance(a, b) / 2;
    const bToC: number = distance(b, c) / 2;
    if (aToB === size || bToC === size) size = 0;
    const bendSize = Math.min(aToB, bToC, size);
    const { x, y } = b;

    // no bend
    if ((a.x === x && x === c.x) || (a.y === y && y === c.y)) {
        return `L${x} ${y}`;
    }

    // first segment is horizontal
    if (a.y === y) {
        const xDir = a.x < c.x ? -1 : 1;
        const yDir = a.y < c.y ? 1 : -1;
        return `L ${x + bendSize * xDir},${y}Q ${x},${y} ${x},${y + bendSize * yDir}`;
    }

    const xDir = a.x < c.x ? 1 : -1;
    const yDir = a.y < c.y ? -1 : 1;
    return `L ${x},${y + bendSize * yDir}Q ${x},${y} ${x + bendSize * xDir},${y}`;
}

export function getElkPath(
    elkEdge: ElkExtendedEdge,
    borderRadius = 5,
): [path: string, labelX: number, labelY: number, offsetX: number, offsetY: number] {
    // Skip when edge data is missing
    if (!elkEdge || !elkEdge.sections) return ['', 0, 0, 0, 0];

    // Build path string
    const section: ElkEdgeSection = elkEdge.sections[0];
    const points: XYPosition[] = [];
    points.push(<XYPosition>section.startPoint);
    if (section.bendPoints) {
        for (let i = 0; i < section.bendPoints.length; i++) {
            points.push(section.bendPoints[i]);
        }
    }
    points.push(<XYPosition>section.endPoint);

    const path = points.reduce<string>((res, p, i) => {
        let segment = '';
        if (i > 0 && i < points.length - 1) {
            // segment = getBend(points[i - 1], p, points[i + 1], borderRadius);
            segment = `L${p.x} ${p.y}`;
        } else {
            segment = `${i === 0 ? 'M' : 'L'}${p.x} ${p.y}`;
        }
        res += segment;
        return res;
    }, '');

    const labelX = 0;
    const labelY = 0;
    const offsetX = 0;
    const offsetY = 0;
    return [path, labelX, labelY, offsetX, offsetY];
}
