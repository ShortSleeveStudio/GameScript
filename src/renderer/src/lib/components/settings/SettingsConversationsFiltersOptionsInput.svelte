<script lang="ts">
    import { IsLoadingStore } from '@lib/stores/utility/is-loading-store';
    import type { ReplaceFunction } from '@lib/utility/filters';
    import { wasEnterPressed, wasSavePressed } from '@lib/utility/keybinding';
    import { Undoable, undoManager } from '@lib/utility/undo-manager';
    import { TextInput } from 'carbon-components-svelte';

    export let undoText: string;
    export let inputPlaceholder: string;
    export let replaceRow: ReplaceFunction;
    export let boundValue: string;

    const isLoading: IsLoadingStore = new IsLoadingStore();
    let currentValue: string = boundValue;

    const syncOnBlur: () => Promise<void> = isLoading.wrapOperationAsync(async () => {
        const newValue = boundValue;
        const oldValue = currentValue;
        if (oldValue === newValue) return;

        // Update column
        await replaceRow(oldValue, newValue);

        // Register undo/redo
        undoManager.register(
            new Undoable(
                `${undoText} change`,
                isLoading.wrapOperationAsync(async () => {
                    await replaceRow(newValue, oldValue);
                }),
                isLoading.wrapOperationAsync(async () => {
                    await replaceRow(oldValue, newValue);
                }),
            ),
        );
    });

    function onKeyUp(e: KeyboardEvent): void {
        if (wasSavePressed(e) || wasEnterPressed(e)) {
            (<HTMLElement>e.target).blur();
        }
    }
</script>

<span class="defeat-form-requirement">
    <TextInput
        size="sm"
        hideLabel
        disabled={$isLoading}
        placeholder={inputPlaceholder}
        bind:value={boundValue}
        on:blur={syncOnBlur}
        on:keyup={onKeyUp}
    />
</span>
