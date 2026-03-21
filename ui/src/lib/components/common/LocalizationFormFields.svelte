<script lang="ts">
    /**
     * Form fields for a single localization × locale, with subject selector.
     *
     * Gender column visibility is fully derived from the localization's subject:
     *
     * | Subject                  | Genders shown                    |
     * |--------------------------|----------------------------------|
     * | None (null)              | Other only                       |
     * | Actor — static masculine | Masculine + Other                |
     * | Actor — static feminine  | Feminine + Other                 |
     * | Actor — static neuter    | Neuter + Other                   |
     * | Actor — static other     | Other only                       |
     * | Actor — dynamic          | All four (Masc, Fem, Neut, Other)|
     * | subject_gender = X       | X + Other (or Other only if X=other)|
     *
     * Plural form rows are always shown for all CLDR-required categories of this locale.
     * Coverage badge counts filled vs expected fields.
     */
    import type { Localization, Locale, PluralCategory, GenderCategory } from '@gamescript/shared';
    import { localeIdToColumns, getRequiredPluralCategories, GENDER_CATEGORIES, PLURAL_DISPLAY_NAMES, GENDER_DISPLAY_NAMES } from '@gamescript/shared';
    import type { IDbRowView } from '$lib/db';
    import { actorsTable } from '$lib/tables/actors.js';
    import { getVisibleGenders } from '$lib/utils/localization-helpers.js';
    import RowColumnTextArea from './RowColumnTextArea.svelte';
    import {
        LOCALIZATION_PLACEHOLDER_TEXT,
        LOCALIZATION_UNDO_TEXT,
    } from '$lib/constants/settings.js';

    interface Props {
        rowView: IDbRowView<Localization>;
        locale: IDbRowView<Locale>;
        /** When true, only show the default form (other/other) — used for actor names */
        defaultOnly?: boolean;
    }

    let { rowView, locale, defaultOnly = false }: Props = $props();

    // CLDR-required plural categories for this locale
    let requiredPlurals = $derived(getRequiredPluralCategories(locale.data.name));

    // Column helper for this locale
    let columns = $derived(localeIdToColumns(locale.data.id));

    // Derive which gender columns to show from subject
    let visibleGenders = $derived.by((): GenderCategory[] => {
        if (defaultOnly) return ['other'];
        return getVisibleGenders(rowView.data, actorsTable.rows);
    });

    // Gender color for field labels
    const GENDER_COLORS: Record<GenderCategory, string> = {
        other: 'var(--gs-fg-secondary, #888)',
        masculine: 'var(--gs-color-blue, #60a5fa)',
        feminine: 'var(--gs-color-pink, #f472b6)',
        neuter: 'var(--gs-color-green, #4ade80)',
    };

    // Build the list of form fields: requiredPlurals × visibleGenders
    interface FormField {
        columnName: string;
        pluralLabel: string;
        genderLabel: string;
        plural: PluralCategory;
        gender: GenderCategory;
        color: string;
    }

    let formFields = $derived.by((): FormField[] => {
        const genders = visibleGenders;
        const fields: FormField[] = [];
        const multiplePlurals = requiredPlurals.length > 1;

        for (const plural of requiredPlurals) {
            for (const gender of GENDER_CATEGORIES) {
                if (!genders.includes(gender)) continue;

                const columnName = columns.form(plural, gender);
                const color = GENDER_COLORS[gender];

                const pluralLabel = multiplePlurals ? `Number: ${PLURAL_DISPLAY_NAMES[plural]}` : '';
                const genderLabel = `Gender: ${GENDER_DISPLAY_NAMES[gender]}`;

                fields.push({ columnName, pluralLabel, genderLabel, plural, gender, color });
            }
        }
        return fields;
    });

    // Coverage: filled vs expected
    let filledCount = $derived(
        formFields.filter(f => {
            const val = rowView.data[f.columnName as keyof Localization];
            return val !== null && val !== undefined && val !== '';
        }).length
    );

    let expectedCount = $derived(formFields.length);
    let isComplete = $derived(filledCount === expectedCount && expectedCount > 0);
    let isPartial = $derived(filledCount > 0 && filledCount < expectedCount);
</script>

<div class="form-fields">
    {#if expectedCount > 1}
        <div class="form-header">
            <span
                class="coverage-badge"
                class:complete={isComplete}
                class:partial={isPartial}
                title="{filledCount} of {expectedCount} expected forms filled"
            >
                {filledCount}/{expectedCount}
            </span>
        </div>
    {/if}

    {#each formFields as field (field.columnName)}
        <div class="form-field">
            {#if field.pluralLabel || field.genderLabel}
                <div class="field-header">
                    <span class="field-label" style="color: {field.color}">{field.pluralLabel}</span>
                    {#if field.genderLabel}
                        <span class="field-label" style="color: {field.color}">{field.genderLabel}</span>
                    {/if}
                </div>
            {/if}
            <RowColumnTextArea
                {rowView}
                columnName={field.columnName}
                undoText={LOCALIZATION_UNDO_TEXT}
                placeholder={LOCALIZATION_PLACEHOLDER_TEXT}
                rows={2}
            />
        </div>
    {/each}
</div>

<style>
    .form-fields {
        display: flex;
        flex-direction: column;
        gap: 0.375rem;
    }

    .form-header {
        display: flex;
        align-items: center;
        justify-content: flex-end;
    }

    .coverage-badge {
        font-size: 0.625rem;
        font-weight: 600;
        padding: 0.125rem 0.375rem;
        border-radius: 8px;
        background: var(--gs-bg-tertiary, #333);
        color: var(--gs-fg-secondary);
        cursor: help;
    }

    .coverage-badge.complete {
        background: var(--gs-success-bg, #1a3a1a);
        color: var(--gs-success-fg, #4ade80);
    }

    .coverage-badge.partial {
        background: var(--gs-warning-bg, #3a2a1a);
        color: var(--gs-warning-fg, #fbbf24);
    }

    .form-field {
        display: flex;
        flex-direction: column;
    }

    .field-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 0.125rem;
    }

    .field-label {
        font-size: 0.6875rem;
        font-weight: 600;
        text-transform: capitalize;
    }
</style>
