<script lang="ts" module>
    // Re-export the payload type for consumers
    export type { PropertyComboboxChangePayload } from './PropertyCombobox.types.js';
</script>

<script lang="ts">
    /**
     * Property Combobox Component.
     *
     * A control that allows selecting from predefined values OR entering a custom value.
     * Uses native <select> for predefined values (handles overflow naturally).
     * Checkbox toggles between predefined/custom mode.
     */
    import type { PropertyValue } from '@gamescript/shared';
    import {
        PROPERTY_TYPE_STRING,
        PROPERTY_TYPE_INTEGER,
        PROPERTY_TYPE_DECIMAL,
        PROPERTY_TYPE_BOOLEAN,
    } from '@gamescript/shared';
    import type { IDbRowView } from '$lib/db';
    import type { PropertyComboboxChangePayload } from './PropertyCombobox.types.js';
    import Checkbox from './Checkbox.svelte';
    import Dropdown from './Dropdown.svelte';

    interface Props {
        /** Available predefined values */
        predefinedValues: IDbRowView<PropertyValue>[];
        /** Template type (string, integer, decimal, boolean) */
        templateType: number;
        /** Whether currently using a custom value (is_reference = false) */
        isCustom: boolean;
        /** Current reference value ID (when isCustom = false) */
        referenceValueId: number | null;
        /** Current custom value (when isCustom = true) */
        customValue: string | number | boolean | null;
        /** Whether the control is disabled */
        disabled?: boolean;
        /** Callback when value changes */
        onchange: (payload: PropertyComboboxChangePayload) => void;
    }

    let {
        predefinedValues,
        templateType,
        isCustom,
        referenceValueId,
        customValue,
        disabled = false,
        onchange,
    }: Props = $props();

    // ============================================================================
    // Derived State
    // ============================================================================

    let isBoolean = $derived(templateType === PROPERTY_TYPE_BOOLEAN.id);
    let hasPredefinedValues = $derived(predefinedValues.length > 0);

    // Build dropdown options from predefined values
    let dropdownOptions = $derived(
        predefinedValues.map(v => ({
            value: v.id,
            label: getValueDisplay(v.data),
        }))
    );

    // ============================================================================
    // Local State
    // ============================================================================

    let customInputValue = $state('');

    // Sync custom input value with prop when showing the custom input
    $effect(() => {
        if (isCustom || !hasPredefinedValues) {
            customInputValue = formatValue(customValue);
        }
    });

    // ============================================================================
    // Helpers
    // ============================================================================

    function getValueDisplay(value: PropertyValue): string {
        switch (templateType) {
            case PROPERTY_TYPE_STRING.id:
                return value.value_string ?? '';
            case PROPERTY_TYPE_INTEGER.id:
                return value.value_integer?.toString() ?? '';
            case PROPERTY_TYPE_DECIMAL.id:
                return value.value_decimal?.toString() ?? '';
            default:
                return '';
        }
    }

    function formatValue(val: string | number | boolean | null): string {
        if (val === null) return '';
        return String(val);
    }

    function parseCustomValue(input: string): string | number | null {
        switch (templateType) {
            case PROPERTY_TYPE_STRING.id:
                return input;
            case PROPERTY_TYPE_INTEGER.id:
                return parseInt(input) || 0;
            case PROPERTY_TYPE_DECIMAL.id:
                return parseFloat(input) || 0;
            default:
                return input;
        }
    }

    // ============================================================================
    // Handlers
    // ============================================================================

    function handleDropdownChange(value: string | number) {
        const valueId = typeof value === 'string' ? parseInt(value, 10) : value;
        onchange({
            isCustom: false,
            referenceValueId: valueId,
            customValue: null,
        });
    }

    function handleCustomCheckboxChange(checked: boolean) {
        if (checked) {
            // Switching to custom mode - initialize with current predefined value if possible
            let initialValue: string | number | null = '';
            if (referenceValueId !== null) {
                const refValue = predefinedValues.find(v => v.id === referenceValueId);
                if (refValue) {
                    initialValue = parseCustomValue(getValueDisplay(refValue.data));
                }
            }
            onchange({
                isCustom: true,
                referenceValueId: null,
                customValue: initialValue,
            });
        } else {
            // Switching to predefined mode - select first available value
            const firstValue = predefinedValues[0];
            onchange({
                isCustom: false,
                referenceValueId: firstValue?.id ?? null,
                customValue: null,
            });
        }
    }

    function handleCustomInputBlur() {
        const parsed = parseCustomValue(customInputValue);
        onchange({
            isCustom: true,
            referenceValueId: null,
            customValue: parsed,
        });
    }

    function handleBooleanChange(checked: boolean) {
        onchange({
            isCustom: true,
            referenceValueId: null,
            customValue: checked,
        });
    }
</script>

<div class="property-combobox">
    {#if isBoolean}
        <Checkbox
            checked={!!customValue}
            {disabled}
            onchange={handleBooleanChange}
        />
    {:else if !hasPredefinedValues}
        <input
            type="text"
            class="value-input"
            {disabled}
            bind:value={customInputValue}
            onblur={handleCustomInputBlur}
        />
    {:else}
        <div class="combobox-row">
            <div class="value-section">
                {#if isCustom}
                    <input
                        type="text"
                        class="value-input"
                        {disabled}
                        bind:value={customInputValue}
                        onblur={handleCustomInputBlur}
                    />
                {:else}
                    <Dropdown
                        options={dropdownOptions}
                        value={referenceValueId ?? ''}
                        {disabled}
                        size="small"
                        onchange={handleDropdownChange}
                    />
                {/if}
            </div>

            <div class="custom-toggle">
                <Checkbox
                    checked={isCustom}
                    {disabled}
                    label="Custom"
                    onchange={handleCustomCheckboxChange}
                />
            </div>
        </div>
    {/if}
</div>

<style>
    .property-combobox {
        width: 100%;
    }

    .combobox-row {
        display: flex;
        align-items: center;
        gap: 0.5rem;
    }

    .value-section {
        flex: 1;
        min-width: 0;
    }

    .custom-toggle {
        flex-shrink: 0;
    }

    .value-input {
        width: 100%;
        padding: 0.25rem 0.5rem;
        font-size: 0.75rem;
        background: var(--gs-bg-secondary);
        border: 1px solid var(--gs-border-primary);
        border-radius: 3px;
        color: var(--gs-fg-primary);
    }

    .value-input:focus {
        outline: none;
        border-color: var(--gs-fg-link);
    }
</style>
