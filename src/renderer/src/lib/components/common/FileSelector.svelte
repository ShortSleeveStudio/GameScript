<script lang="ts">
    import { Button, OverflowMenu, TextInput } from 'carbon-components-svelte';
    import { OverflowMenuVertical } from 'carbon-icons-svelte';

    export let buttonText: string;
    export let buttonDisabled: boolean = false;
    export let fieldText: string = '';
    export let fieldPlaceholder: string = '';
</script>

<span class="button-set">
    <Button size="small" disabled={buttonDisabled} on:click>{buttonText}</Button>
    <TextInput size="sm" disabled={true} value={fieldText} placeholder={fieldPlaceholder} />
    {#if $$slots.overflow}
        <OverflowMenu flipped size="sm" style="width: auto;">
            <div slot="menu">
                <Button
                    tooltipPosition="left"
                    iconDescription="Options"
                    size="small"
                    kind="secondary"
                    icon={OverflowMenuVertical}
                />
            </div>
            <slot name="overflow" />
        </OverflowMenu>
    {/if}
</span>
