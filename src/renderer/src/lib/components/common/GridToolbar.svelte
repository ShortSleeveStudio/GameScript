<script lang="ts">
    import { OverflowMenu } from 'carbon-components-svelte';
    import { Settings } from 'carbon-icons-svelte';
    import { createEventDispatcher } from 'svelte';

    const CLASS_BATCH_ACTIONS_ACTIVE: string = 'bx--batch-actions--active';

    export let elementsSelected: number;
    export let disabled: boolean = false;

    let flipped: boolean = false;
    let isOverflowOpen: boolean;
    let locationInPageFinder: HTMLDivElement;

    const dispatch = createEventDispatcher();

    function onCancel(): void {
        dispatch('cancel');
    }

    function recalculateOpenDirection(): void {
        const innerRect: DOMRect = locationInPageFinder.getBoundingClientRect();
        const nearestDocContainer: HTMLDivElement = locationInPageFinder.closest('.lm_content');
        if (!nearestDocContainer) return;
        const outerRect: DOMRect = nearestDocContainer.getBoundingClientRect();
        const distanceToLeft = innerRect.left - outerRect.left;
        const distanceToRight = outerRect.right - innerRect.right;
        if (distanceToLeft >= distanceToRight) {
            flipped = true;
        } else {
            flipped = false;
        }
    }
</script>

<section
    aria-label="data table toolbar"
    class="bx--table-toolbar bx--table-toolbar--small"
    style:z-index={3}
    style:overflow="visible"
>
    {#if !isOverflowOpen && $$slots.delete}
        <div class="bx--batch-actions {elementsSelected > 0 ? CLASS_BATCH_ACTIONS_ACTIVE : ''}">
            <div class="bx--batch-summary">
                <p class="bx--batch-summary__para no-wrap">
                    <span>{elementsSelected} item{elementsSelected > 1 ? 's' : ''} selected</span>
                </p>
            </div>
            <div class="bx--action-list no-wrap">
                <slot name="delete" />
                <button
                    type="button"
                    tabindex="0"
                    class="bx--btn bx--btn--primary bx--batch-summary__cancel"
                    on:click={onCancel}
                >
                    Cancel</button
                >
            </div>
        </div>
    {/if}
    <div class="bx--toolbar-content">
        {#if $$slots.search}
            <slot name="search" />
        {/if}
        <span style="display: flex;">
            {#if $$slots.overflow}
                <!-- svelte-ignore a11y-no-static-element-interactions -->
                <div on:mouseenter={recalculateOpenDirection} bind:this={locationInPageFinder}>
                    <OverflowMenu
                        {disabled}
                        {flipped}
                        size="sm"
                        class="bx--toolbar-action bx--overflow-menu"
                        icon={Settings}
                        bind:open={isOverflowOpen}
                    >
                        <slot name="overflow" />
                    </OverflowMenu>
                </div>
            {/if}
            {#if $$slots.create}
                <slot name="create" />
            {/if}
        </span>
    </div>
</section>

<style>
    .no-wrap {
        text-wrap: nowrap;
    }
</style>
