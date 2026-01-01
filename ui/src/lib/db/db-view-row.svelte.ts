/**
 * DbRowView - Reactive wrapper around a database row using Svelte 5 runes.
 *
 * Each row in the database has at most one DbRowView instance, which is
 * shared across all components that display or edit that row.
 *
 * When the row is updated (via _update), the reactive $state is updated
 * and all components reading rowView.data automatically re-render.
 *
 * Usage:
 * - Access data via .data property
 * - Works naturally with $derived and $effect
 * - No manual subscription management needed
 */

import type { Row, TableRef as TableType } from '@gamescript/shared';
import type { IDbRowView } from './db-view-row-interface.js';

/** Callback invoked when a row view is destroyed */
export type RowViewDestructor = () => void;

/** Row view implementation using Svelte 5 runes */
export class DbRowView<RowType extends Row> implements IDbRowView<RowType> {
    readonly tableType: TableType;
    readonly tableId: number;
    readonly tableName: string;

    // Reactive state using $state rune
    #data: RowType = $state() as RowType;
    #isDisposed: boolean = $state(false);

    // Non-reactive internal state
    #id: number;
    #owners: Set<number>;
    #destructor: RowViewDestructor;

    constructor(tableType: TableType, row: RowType, destructor: RowViewDestructor) {
        this.tableType = tableType;
        this.tableId = tableType.id;
        this.tableName = tableType.name;
        this.#id = row.id;
        this.#data = row;
        this.#owners = new Set();
        this.#destructor = destructor;
    }

    /** Row ID (stable, doesn't change) */
    get id(): number {
        return this.#id;
    }

    /** Whether this row view has been disposed */
    get isDisposed(): boolean {
        return this.#isDisposed;
    }

    /**
     * Reactive row data.
     * Reading this in a $derived or template establishes a reactive dependency.
     */
    get data(): RowType {
        return this.#data;
    }

    /**
     * Get the current row value without establishing reactivity.
     * Useful for one-time reads or snapshots.
     */
    getValue(): RowType {
        return this.#data;
    }

    /**
     * Get the number of owners (containers) tracking this row view.
     * @internal
     */
    ownerCount(): number {
        return this.#owners.size;
    }

    /**
     * Add an owner (container) that is tracking this row view.
     * @internal
     */
    ownerAdd(ownerId: number): void {
        this.#owners.add(ownerId);
    }

    /**
     * Remove an owner (container) that was tracking this row view.
     * When the last owner is removed, the row view is disposed.
     * @internal
     */
    ownerRemove(ownerId: number): void {
        this.#owners.delete(ownerId);
        if (this.#owners.size === 0) {
            this.#destructor();
            this.#isDisposed = true;
        }
    }

    /**
     * Update the row data. Called when the database notifies us of a change.
     * This triggers all reactive dependencies to re-evaluate.
     * @internal
     */
    _update(newRow: RowType): void {
        if (this.#isDisposed) return;
        this.#data = newRow;
    }
}
