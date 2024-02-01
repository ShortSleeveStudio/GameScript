<script lang="ts">
    import { writable } from 'svelte/store';
    import {
        SvelteFlow,
        Controls,
        Background,
        MiniMap,
        type SnapGrid,
        BackgroundVariant,
    } from '@xyflow/svelte';

    const nodes = writable([
        {
            id: '1',
            type: 'input',
            data: { label: 'Input Node' },
            position: { x: 0, y: 0 },
        },
        {
            id: '2',
            type: 'default',
            data: { label: 'Node' },
            position: { x: 0, y: 150 },
        },
    ]);

    // same for edges
    const edges = writable([
        {
            id: '1-2',
            type: 'default',
            source: '1',
            target: '2',
            label: 'Edge Text',
        },
    ]);

    const snapGrid: SnapGrid = [30, 30];
</script>

<div class="graph-container">
    <SvelteFlow {nodes} {edges} {snapGrid} fitView proOptions={{ hideAttribution: true }}>
        <Controls />
        <Background gap={snapGrid} variant={BackgroundVariant.Dots} />
        <MiniMap />
    </SvelteFlow>
</div>

<style>
    .graph-container {
        height: 100%;
        width: 100%;
    }
</style>
