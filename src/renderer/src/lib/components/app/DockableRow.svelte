<script lang="ts">
    import { Row } from 'carbon-components-svelte';

    export let isFullHeight: boolean = true;
</script>

<Row style={isFullHeight ? 'height: 100%' : ''}>
    <slot />
</Row>
