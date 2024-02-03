<script lang="ts">
    import type { Row } from '@lib/api/db/db-schema';
    import type { IDbRowView } from '@lib/api/db/db-view-row-interface';
    import { getContext, onDestroy, onMount } from 'svelte';
    import type { Unsubscriber } from 'svelte/motion';
    import { get } from 'svelte/store';

    /**CUSTOM START*/
    export let rowView: IDbRowView<Row>;
    export let columnNameText: string = '';
    export let columnNameValue: string;
    export let textOverride: string = '';
    /**CUSTOM END*/

    /** Set to `true` to hide the option */
    export let hidden = false;

    /** Set to `true` to disable the option */
    export let disabled = false;

    let className = undefined;

    /**
     * Specify the class of the `option` element
     * @type {string}
     */
    export { className as class };

    /**
     * Specify the style of the `option` element
     * @type {string}
     */
    export let style = undefined;

    const ctx = getContext('Select') || getContext('TimePickerSelect');
    let selected = false;
    let selectedValueUnsubscriber: Unsubscriber;

    onMount(() => {
        selectedValueUnsubscriber = ctx.selectedValue.subscribe((currentValue) => {
            const value: string = get(rowView)[columnNameValue].toString();
            selected = currentValue === value;
        });
    });
    onDestroy(() => {
        if (selectedValueUnsubscriber) selectedValueUnsubscriber();
    });
</script>

<option
    value={$rowView[columnNameValue].toString()}
    {disabled}
    {hidden}
    {selected}
    class:bx--select-option={true}
    class={className}
    {style}
>
    {textOverride ? textOverride : columnNameText ? $rowView[columnNameText] : ''}
</option>
