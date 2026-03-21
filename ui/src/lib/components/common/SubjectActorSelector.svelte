<script lang="ts">
    /**
     * Subject selector for localizations — translator concern, lives inside each locale accordion.
     *
     * Single grouped dropdown:
     *   ── Actors ──────────────
     *     Elara         (feminine)
     *     Player        (dynamic)
     *   ── Gender ──────────────
     *     Masculine
     *     Feminine
     *     Neuter
     *     Other
     *
     * Selecting an actor sets subject_actor, clears subject_gender.
     * Selecting a gender sets subject_gender, clears subject_actor.
     * Selecting "(None)" clears both.
     *
     * The single DB fields are shared across all locale accordions — a change
     * in one section is immediately reflected in all others.
     */
    import { GENDER_CATEGORIES, GENDER_DISPLAY_NAMES, type Localization } from '@gamescript/shared';
    import type { IDbRowView } from '$lib/db';
    import { IsLoadingStore } from '$lib/stores/is-loading.js';
    import { actorsTable } from '$lib/tables/actors.js';
    import { common } from '$lib/crud';
    import { InspectorField } from '$lib/components/common';

    interface Props {
        rowView: IDbRowView<Localization>;
    }

    let { rowView }: Props = $props();

    const isLoading = new IsLoadingStore();

    // Encode the current value as a prefixed string for the native select
    // "actor:N"   — subject_actor is set to N
    // "gender:G"  — subject_gender is set to G
    // ""          — neither is set (None)
    let currentValue = $derived.by((): string => {
        const actor = rowView.data.subject_actor as number | null;
        const gender = rowView.data.subject_gender as string | null;
        if (actor !== null) return `actor:${actor}`;
        if (gender !== null) return `gender:${gender}`;
        return '';
    });

    // Dynamic tooltip describing current gender resolution
    let tooltip = $derived.by((): string => {
        const actorId = rowView.data.subject_actor as number | null;
        const subjectGender = rowView.data.subject_gender as string | null;

        if (actorId !== null) {
            const actor = actorsTable.rows.find(r => r.id === actorId);
            const name = actor?.data.name ?? 'Unknown';
            const gg = actor?.data.grammatical_gender ?? 'other';
            if (gg === 'dynamic') {
                return `Gender resolved dynamically from ${name} at runtime.`;
            }
            return `Gender resolves as ${gg} (from ${name}).`;
        }

        if (subjectGender !== null) {
            return `Gender resolves as ${subjectGender}.`;
        }

        return 'No subject set. Gender resolves as other.';
    });

    async function onchange(event: Event): Promise<void> {
        const value = (event.target as HTMLSelectElement).value;
        const oldRow = { ...rowView.getValue() };
        let newRow: typeof oldRow;

        if (value === '') {
            newRow = { ...oldRow, subject_actor: null, subject_gender: null };
        } else if (value.startsWith('actor:')) {
            const id = parseInt(value.slice(6), 10);
            newRow = { ...oldRow, subject_actor: id, subject_gender: null };
        } else if (value.startsWith('gender:')) {
            const g = value.slice(7);
            newRow = { ...oldRow, subject_actor: null, subject_gender: g };
        } else {
            return;
        }

        await isLoading.wrapPromise(
            common.updateOne(rowView.tableType, oldRow, newRow, 'subject change')
        );
    }
</script>

<InspectorField
    label="Subject"
    {tooltip}
>
    <select
        class="subject-select"
        value={currentValue}
        disabled={$isLoading}
        {onchange}
    >
        <option value="">(None)</option>

        {#if actorsTable.rows.length > 0}
            <optgroup label="── Actors ──────────────">
                {#each actorsTable.rows as actor (actor.id)}
                    <option value="actor:{actor.id}">
                        {actor.data.name} ({actor.data.grammatical_gender})
                    </option>
                {/each}
            </optgroup>
        {/if}

        <optgroup label="── Gender ──────────────">
            {#each GENDER_CATEGORIES as gender (gender)}
                <option value="gender:{gender}">{GENDER_DISPLAY_NAMES[gender]}</option>
            {/each}
        </optgroup>
    </select>
</InspectorField>

<style>
    .subject-select {
        width: 100%;
        padding: 2px 4px;
        font-size: var(--gs-font-size-small, 11px);
        font-family: inherit;
        background: var(--gs-dropdown-bg);
        color: var(--gs-dropdown-fg);
        border: 1px solid var(--gs-dropdown-border);
        border-radius: 2px;
        cursor: pointer;
        appearance: auto;
    }

    .subject-select:focus {
        outline: none;
        border-color: var(--gs-border-focus);
    }

    .subject-select:disabled {
        opacity: 0.5;
        cursor: not-allowed;
    }

    .subject-select option,
    .subject-select optgroup {
        background: var(--gs-dropdown-bg);
        color: var(--gs-dropdown-fg);
    }
</style>
