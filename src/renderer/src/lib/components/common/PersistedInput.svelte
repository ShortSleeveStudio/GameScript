<script lang="ts">
    import { wasEnterPressed, wasSavePressed } from '@lib/utility/keybinding';
    import type { Writable } from 'svelte/store';
    import { PasswordInput, TextInput } from 'carbon-components-svelte';
    import { Undoable, undoManager } from '@lib/utility/undo-manager';

    export let persistent: Writable<object>;
    export let columnName: string;
    export let undoText: string;
    export let inputPlaceholder: string;
    export let isNumber: boolean = false;
    export let numberMin: number = Number.NEGATIVE_INFINITY;
    export let numberMax: number = Number.POSITIVE_INFINITY;
    export let disabled: boolean = false;
    export let isPassword: boolean = false;
    export let readWrapper: (str: string) => string | undefined = undefined;
    export let writeWrapper: (str: string) => string | undefined = undefined;
    export let enforceLowercase: boolean = false;

    let boundValue: string = readWrapper
        ? readWrapper(<string>$persistent[columnName])
        : <string>$persistent[columnName];
    let currentValue: string = boundValue;

    function syncOnBlur(): void {
        sanitizeBoundValue();
        const newValue = writeWrapper ? writeWrapper(boundValue) : boundValue;
        const oldValue = writeWrapper ? writeWrapper(currentValue) : currentValue;
        if (oldValue === newValue) return;

        // Update column
        persistent.update((obj: object) => {
            obj[columnName] = newValue;
            return obj;
        });

        undoManager.register(
            new Undoable(
                `${undoText} change`,
                async () => {
                    persistent.update((obj: object) => {
                        obj[columnName] = oldValue;
                        return obj;
                    });
                },
                async () => {
                    persistent.update((obj: object) => {
                        obj[columnName] = newValue;
                        return obj;
                    });
                },
            ),
        );
    }

    function onKeyUp(e: KeyboardEvent): void {
        if (wasSavePressed(e) || wasEnterPressed(e)) {
            (<HTMLElement>e.target).blur();
        }
    }

    function onInput(): void {
        if (!isNumber) return;
        if (boundValue === '' || boundValue === '-') return;
        sanitizeBoundValue();
    }

    function sanitizeBoundValue(): void {
        if (isNumber) {
            let num: number = parseInt(boundValue);
            if (isNaN(num)) {
                num = 0;
            }
            const newNum = num > 0 ? Math.min(numberMax, num) : Math.max(numberMin, num);
            boundValue = newNum.toString();
        } else if (enforceLowercase && boundValue) {
            boundValue = boundValue.toLowerCase();
        }
    }
</script>

<span class="defeat-form-requirement">
    {#if isPassword}
        <PasswordInput
            size="sm"
            hideLabel
            placeholder={inputPlaceholder}
            {disabled}
            bind:value={boundValue}
            on:blur={syncOnBlur}
            on:keyup={onKeyUp}
            on:input={onInput}
            tooltipPosition="left"
        />
    {:else}
        <TextInput
            size="sm"
            hideLabel
            placeholder={inputPlaceholder}
            {disabled}
            bind:value={boundValue}
            on:blur={syncOnBlur}
            on:keyup={onKeyUp}
            on:input={onInput}
        />
    {/if}
</span>
