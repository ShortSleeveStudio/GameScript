import {
    writable,
    type Invalidator,
    type Readable,
    type Subscriber,
    type Unsubscriber,
    type Writable,
} from 'svelte/store';

/**
 * This is used to wrap operations and share whether those operations are currently in-flight.
 */
export class IsLoadingStore implements Readable<boolean> {
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

    async wrapPromise<T>(promise: Promise<T>): Promise<T> {
        try {
            this.increment();
            return await promise;
        } finally {
            this.decrement();
        }
    }

    wrapFunction(operation: () => Promise<void>): () => Promise<void> {
        return async () => {
            try {
                this.increment();
                await operation();
            } finally {
                this.decrement();
            }
        };
    }

    private increment(): void {
        this._internalIsLoading.set(++this._pendingChanges > 0);
    }

    private decrement(): void {
        this._internalIsLoading.set(--this._pendingChanges > 0);
    }
}
