<script lang="ts">
    import { Select } from 'carbon-components-svelte';
    import SelectItemCustom from '../carbon/SelectItemCustom.svelte';
    import { nodePropertyTemplates } from '@lib/tables/node-property-templates';
    import { get } from 'svelte/store';

    export let boundValue: number =
        nodePropertyTemplates && get(nodePropertyTemplates).length > 0
            ? get(nodePropertyTemplates)[0].id
            : undefined;
</script>

<Select hideLabel size="sm" style="width: 100%;" bind:selected={boundValue}>
    {#each $nodePropertyTemplates as template (template.id)}
        <SelectItemCustom rowView={template} columnNameText={'name'} columnNameValue={'id'} />
    {/each}
</Select>
