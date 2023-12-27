import {
    writable,
    type Invalidator,
    type Readable,
    type Subscriber,
    type Unsubscriber,
    type Writable,
} from 'svelte/store';

/**
 * A simple store for tracking loading state.
 */
export class IsLoading implements Readable<boolean> {
    private _pendingChanges: number;
    private _internalIsLoading: Writable<boolean>;

    constructor() {
        this._pendingChanges = 0;
        this._internalIsLoading = writable(false);
    }

    subscribe(
        run: Subscriber<boolean>,
        invalidate?: Invalidator<boolean> | undefined,
    ): Unsubscriber {
        return this._internalIsLoading.subscribe(run, invalidate);
    }

    increment() {
        this._internalIsLoading.set(++this._pendingChanges > 0);
    }

    decrement() {
        this._internalIsLoading.set(--this._pendingChanges > 0);
    }
}
