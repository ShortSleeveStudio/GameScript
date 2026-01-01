<script lang="ts">
    /**
     * Radio button for principal selection.
     *
     * Used to select one item as the "principal" from a list.
     * For example, selecting the default locale or primary actor.
     *
     * Features:
     * - Tracks a "principal" row that stores which ID is selected
     * - Undo/redo support
     * - Loading state handling
     *
     * Ported from GameScriptElectron.
     */
    import { IsLoadingStore } from '$lib/stores/is-loading.js';
    import { type IDbRowView } from '$lib/db';
    import type { Row, Principaled } from '@gamescript/shared';
    import { common } from '$lib/crud';

    interface Props {
        rowView: IDbRowView<Row>;
        principalStore?: IDbRowView<Row & Principaled> | undefined;
        undoText: string;
    }

    let { rowView, principalStore = undefined, undoText }: Props = $props();

    const isLoading = new IsLoadingStore();

    // Derive checked state from principal store
    let checked = $derived(principalStore ? rowView.id === principalStore.data.principal : false);

    async function onRadioChanged(e: Event): Promise<void> {
        if (!principalStore) return;
        (e.target as HTMLElement).blur(); // Allows us to undo/redo
        await onRadioChangedAsync();
    }

    async function onRadioChangedAsync(): Promise<void> {
        if (!principalStore) return;

        const tableType = principalStore.tableType;
        const oldRow = { ...principalStore.getValue() };
        const newRow = { ...oldRow, principal: rowView.id };

        await isLoading.wrapPromise(
            common.updateOne(tableType, oldRow, newRow, `${undoText} change`)
        );
    }
</script>

<label class="row-column-radio">
    <input
        type="radio"
        checked={checked}
        disabled={$isLoading}
        onchange={onRadioChanged}
    />
</label>

<style>
    .row-column-radio {
        display: inline-flex;
        align-items: center;
        cursor: pointer;
    }

    .row-column-radio input[type="radio"] {
        width: 16px;
        height: 16px;
        margin: 0;
        cursor: pointer;
        accent-color: var(--gs-fg-link);
    }

    .row-column-radio input[type="radio"]:disabled {
        opacity: 0.5;
        cursor: not-allowed;
    }
</style>
