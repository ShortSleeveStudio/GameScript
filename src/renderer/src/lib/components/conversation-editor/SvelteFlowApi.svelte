<script lang="ts">
    import { useStore } from '@xyflow/svelte';
    import type { Writable } from 'svelte/store';

    const svelteStore = useStore();
    export const deleteKeyPressed: Writable<boolean> = svelteStore.deleteKeyPressed;
</script>
