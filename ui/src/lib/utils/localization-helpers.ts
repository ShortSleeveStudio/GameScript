/**
 * Localization utility helpers for UI components.
 */

import type { Localization, Actor, GenderCategory } from '@gamescript/shared';
import { localeIdToColumns } from '@gamescript/shared';
import type { IDbRowView } from '$lib/db';

/**
 * Derive which gender columns should be visible for a localization.
 *
 * | Subject                  | Genders shown                     |
 * |--------------------------|-----------------------------------|
 * | None (null)              | Other only                        |
 * | Actor — static masculine | Masculine + Other                 |
 * | Actor — static feminine  | Feminine + Other                  |
 * | Actor — static neuter    | Neuter + Other                    |
 * | Actor — static other     | Other only                        |
 * | Actor — dynamic          | All four (Masc, Fem, Neut, Other) |
 * | subject_gender = X       | X + Other (or Other only if X=other)|
 *
 * @param localization - The localization row
 * @param actors - All actors (reactive row views)
 */
export function getVisibleGenders(
    localization: Localization,
    actors: IDbRowView<Actor>[],
): GenderCategory[] {
    const actorId = localization.subject_actor as number | null;
    const subjectGender = localization.subject_gender as string | null;

    if (actorId !== null) {
        const actor = actors.find(r => r.id === actorId);
        const gg = actor?.data.grammatical_gender ?? 'other';
        if (gg === 'dynamic') return ['masculine', 'feminine', 'neuter', 'other'];
        if (gg === 'other') return ['other'];
        return [gg as GenderCategory, 'other'];
    }

    if (subjectGender !== null) {
        if (subjectGender === 'other') return ['other'];
        return [subjectGender as GenderCategory, 'other'];
    }

    return ['other'];
}

/**
 * Resolve the column name to display in a node text preview.
 *
 * Selects plural=other for the primary locale, with gender chosen by:
 *   1. subject_actor → actor's grammatical_gender ('dynamic' → 'other' in editor)
 *   2. subject_gender → that gender directly
 *   3. Neither → 'other'
 *
 * If the resolved column is empty, falls back to the x-source other/other column
 * so the node always shows something while authoring.
 */
export function resolvePreviewColumn(
    localization: Localization,
    primaryLocaleId: number,
    xSourceLocaleId: number,
    actors: IDbRowView<Actor>[],
): string {
    const primaryCols = localeIdToColumns(primaryLocaleId);

    let gender: GenderCategory = 'other';

    const actorId = localization.subject_actor as number | null;
    const subjectGender = localization.subject_gender as string | null;

    if (actorId !== null) {
        const actor = actors.find(a => a.id === actorId);
        const gg = actor?.data.grammatical_gender ?? 'other';
        // dynamic → 'other' in editor preview (runtime will use actual gender)
        gender = (gg === 'dynamic' ? 'other' : gg) as GenderCategory;
    } else if (subjectGender !== null) {
        gender = subjectGender as GenderCategory;
    }

    const resolvedColumn = primaryCols.form('other', gender);

    // Use resolved column if it has data; otherwise fall back to x-source
    const value = localization[resolvedColumn as keyof Localization];
    if (value !== null && value !== undefined && value !== '') {
        return resolvedColumn;
    }

    return localeIdToColumns(xSourceLocaleId).default;
}
