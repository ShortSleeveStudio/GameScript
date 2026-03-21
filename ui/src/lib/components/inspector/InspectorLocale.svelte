<script lang="ts">
    /**
     * Inspector panel for Locale rows.
     *
     * Displays editable fields for locale code (with CLDR dropdown),
     * primary selection, and localized name.
     *
     * Ported from GameScriptElectron, updated for CLDR locale code selection.
     */
    import type { Locale } from '@gamescript/shared';
    import { LOCALE_AUTONYMS, isKnownLocale, getLocaleAutonym } from '@gamescript/shared';
    import type { IDbRowView } from '$lib/db';
    import type { FocusPayloadLocale } from '$lib/stores/focus.js';
    import { IsLoadingStore } from '$lib/stores/is-loading.js';
    import { wasSavePressed } from '$lib/utils/keybinding.js';
    import { common } from '$lib/crud';
    import { RowColumnId, InspectorField, Dropdown } from '$lib/components/common';
    import RowColumnRadio from '$lib/components/common/RowColumnRadio.svelte';
    import RowColumnLocalization from '$lib/components/common/RowColumnLocalization.svelte';
    import { LOCALE_UNDO_PRIMARY, LOCALE_UNDO_CODE } from '$lib/constants/settings';

    const CUSTOM_VALUE = '__custom__';

    interface Props {
        rowView: IDbRowView<Locale>;
        payload?: FocusPayloadLocale | undefined;
    }

    let { rowView, payload = undefined }: Props = $props();

    const isLoading = new IsLoadingStore();

    // System-created locales (x-source) are read-only
    let isSystemCreated = $derived(Boolean(rowView.data.is_system_created));

    // Whether the user is in custom (free-text) mode
    let isCustomMode: boolean = $state(false);
    let customInputValue: string = $state('');

    // Build dropdown options from CLDR autonyms
    const cldrOptions = [...LOCALE_AUTONYMS.entries()]
        .sort((a, b) => a[0].localeCompare(b[0]))
        .map(([code, autonym]) => ({ value: code, label: `${code} — ${autonym}` }));

    // Full options list: CLDR options + Custom entry
    const dropdownOptions = [
        ...cldrOptions,
        { value: CUSTOM_VALUE, label: 'Custom...' },
    ];

    // Current saved value from DB
    let currentCode = $derived(rowView.data.name);

    // The "active" code — what the user is currently working with
    let activeCode = $derived(isCustomMode ? customInputValue : currentCode);

    // CLDR validity of the active code (updates while typing in custom mode)
    let isValidCldr = $derived(isKnownLocale(activeCode));

    // Find the best matching dropdown option for the current code.
    // Handles cases like "en_US" matching dropdown option "en".
    function findDropdownMatch(code: string): string | null {
        // Exact match
        if (cldrOptions.some(o => o.value === code)) return code;
        // Normalized separator (en_US → en-US, but CLDR autonyms use bare codes like "en")
        const normalized = code.includes('_') ? code.replace(/_/g, '-') : code.replace(/-/g, '_');
        if (cldrOptions.some(o => o.value === normalized)) return normalized;
        // Language subtag (en_US → en)
        const lang = code.split(/[-_]/)[0];
        if (lang !== code && cldrOptions.some(o => o.value === lang)) return lang;
        return null;
    }

    let dropdownMatchCode = $derived(findDropdownMatch(currentCode));
    let isCurrentInCldr = $derived(dropdownMatchCode !== null);

    // Sync custom mode with the current locale code
    $effect(() => {
        if (isCurrentInCldr) {
            isCustomMode = false;
        } else if (currentCode) {
            isCustomMode = true;
            customInputValue = currentCode;
        }
    });

    // Unique name validation
    let isUnique: boolean = $state(true);

    $effect(() => {
        const tracker = payload?.uniqueNameTracker;
        isUnique = tracker ? tracker.isUnique(rowView.id, activeCode) : true;
    });

    async function onDropdownChange(value: string | number): Promise<void> {
        if (typeof value !== 'string') return;

        if (value === CUSTOM_VALUE) {
            isCustomMode = true;
            customInputValue = currentCode;
            return;
        }

        // Exit custom mode if a CLDR option was selected
        isCustomMode = false;

        if (value === currentCode) return;

        const oldRow = { ...rowView.getValue() };
        const newRow = { ...oldRow, name: value };
        await isLoading.wrapPromise(
            common.updateOne(rowView.tableType, oldRow, newRow, LOCALE_UNDO_CODE)
        );
    }

    function onCustomKeyUp(e: KeyboardEvent): void {
        if (wasSavePressed(e)) {
            (e.target as HTMLInputElement)?.blur();
        }
    }

    async function onCustomBlur(): Promise<void> {
        const newValue = customInputValue.trim();
        if (!newValue) {
            // Don't allow empty — revert to current
            customInputValue = currentCode;
            return;
        }
        if (newValue === currentCode) return;

        const oldRow = { ...rowView.getValue() };
        const newRow = { ...oldRow, name: newValue };
        await isLoading.wrapPromise(
            common.updateOne(rowView.tableType, oldRow, newRow, LOCALE_UNDO_CODE)
        );
    }

    function onCancelCustom(): void {
        isCustomMode = false;
    }
</script>

<h2>Locale</h2>

<InspectorField label="ID">
    <RowColumnId {rowView} />
</InspectorField>

{#if isSystemCreated}
    <!-- System-created locale (x-source): code is read-only, but primary selection allowed -->
    <InspectorField
        label="Locale Code"
        tooltip="Source locale — used for in-editor authoring and preview. Not shipped to players."
    >
        <span class="system-locale-code">🔒 {currentCode}</span>
    </InspectorField>

    <InspectorField label="Primary">
        <RowColumnRadio
            {rowView}
            undoText={LOCALE_UNDO_PRIMARY}
            principalStore={payload?.localePrincipalRowView}
        />
    </InspectorField>

    <p class="system-locale-hint">
        Source locale for authoring. Cannot be renamed or deleted.
    </p>
{:else}
    <InspectorField
        label="Locale Code"
        tooltip="CLDR locale code (e.g., en, fr, ja, de). Determines which plural forms are available."
    >
        <div class="locale-code-input">
            {#if isCustomMode}
                <div class="custom-input-row">
                    <input
                        type="text"
                        bind:value={customInputValue}
                        disabled={$isLoading}
                        placeholder="e.g., en, fr, ja"
                        onblur={onCustomBlur}
                        onkeyup={onCustomKeyUp}
                        class="locale-input"
                        class:invalid={!isUnique}
                    />
                    <button
                        class="cancel-button"
                        onclick={onCancelCustom}
                        title="Back to dropdown"
                        disabled={$isLoading}
                    >
                        ×
                    </button>
                </div>
            {:else}
                <Dropdown
                    options={dropdownOptions}
                    value={dropdownMatchCode ?? CUSTOM_VALUE}
                    disabled={$isLoading}
                    onchange={onDropdownChange}
                    size="small"
                />
            {/if}
            {#if !isUnique}
                <span class="locale-warning" title="Another locale already uses this code.">
                    Duplicate code
                </span>
            {:else if activeCode && !isValidCldr}
                <span class="locale-warning" title="This code doesn't match any CLDR locale. Plural forms will default to 'other' only.">
                    Unknown locale
                </span>
            {/if}
        </div>
    </InspectorField>

    <InspectorField label="Primary">
        <RowColumnRadio
            {rowView}
            undoText={LOCALE_UNDO_PRIMARY}
            principalStore={payload?.localePrincipalRowView}
        />
    </InspectorField>

    {#if isValidCldr}
        <InspectorField
            label="Display Name"
            tooltip="Automatically derived from the CLDR locale code. This is the language's name in its own script, used in language selectors."
        >
            <span class="cldr-display-name">{getLocaleAutonym(activeCode)}</span>
        </InspectorField>
    {:else}
        <InspectorField label="Localized Name">
            <RowColumnLocalization {rowView} columnName={'localized_name'} />
        </InspectorField>
    {/if}
{/if}

<style>
    h2 {
        margin: 0 0 1rem 0;
        font-size: 1.125rem;
        font-weight: 600;
        color: var(--gs-fg-primary);
    }

    .locale-code-input {
        display: flex;
        flex-direction: column;
        gap: 0.25rem;
    }

    .custom-input-row {
        display: flex;
        gap: 0.25rem;
    }

    .locale-input {
        flex: 1;
        padding: 0.375rem 0.5rem;
        font-size: 0.8125rem;
        font-family: inherit;
        color: var(--gs-fg-primary);
        background: var(--gs-bg-input, var(--gs-bg-tertiary));
        border: 1px solid var(--gs-border-primary);
        border-radius: 4px;
        outline: none;
        box-sizing: border-box;
    }

    .locale-input:focus {
        border-color: var(--gs-accent-fg, #60a5fa);
    }

    .locale-input:disabled {
        opacity: 0.5;
    }

    .locale-input.invalid {
        border-color: var(--gs-error-fg, #ef4444);
    }

    .cancel-button {
        padding: 0 0.5rem;
        font-size: 1rem;
        color: var(--gs-fg-secondary);
        background: var(--gs-bg-tertiary);
        border: 1px solid var(--gs-border-primary);
        border-radius: 4px;
        cursor: pointer;
    }

    .cancel-button:hover {
        color: var(--gs-fg-primary);
    }

    .cldr-display-name {
        font-size: 0.8125rem;
        color: var(--gs-fg-primary);
        padding: 0.375rem 0;
    }

    .locale-warning {
        font-size: 0.625rem;
        color: var(--gs-warning-fg, #fbbf24);
        cursor: help;
    }

    .system-locale-code {
        font-size: 0.8125rem;
        color: var(--gs-fg-secondary);
        font-style: italic;
        padding: 0.375rem 0;
    }

    .system-locale-hint {
        font-size: 0.6875rem;
        color: var(--gs-fg-tertiary, #666);
        margin: 0;
        line-height: 1.4;
    }
</style>
