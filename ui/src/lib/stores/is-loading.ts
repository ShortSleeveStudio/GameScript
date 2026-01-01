/**
 * IsLoadingStore - tracks nested async operations.
 *
 * This store is useful for:
 * - Disabling UI during operations
 * - Showing loading spinners
 * - Preventing double-clicks
 *
 * Supports nested operations (multiple concurrent async calls).
 *
 * @example
 * ```ts
 * const isLoading = new IsLoadingStore();
 *
 * // Subscribe to loading state
 * $: disabled = $isLoading;
 *
 * // Wrap promises
 * await isLoading.wrapPromise(saveData());
 *
 * // Or wrap functions
 * const handleSave = isLoading.wrapFunction(async () => {
 *   await saveData();
 * });
 * ```
 */

import {
  writable,
  type Readable,
  type Subscriber,
  type Unsubscriber,
  type Writable,
} from 'svelte/store';

export class IsLoadingStore implements Readable<boolean> {
  private pendingCount = 0;
  private internalStore: Writable<boolean>;

  constructor() {
    this.internalStore = writable(false);
  }

  /**
   * Subscribe to the loading state.
   * Returns true when any wrapped operation is in progress.
   */
  subscribe(run: Subscriber<boolean>): Unsubscriber {
    return this.internalStore.subscribe(run);
  }

  /**
   * Wrap a promise and track its loading state.
   * Multiple concurrent promises are supported.
   */
  async wrapPromise<T>(promise: Promise<T>): Promise<T> {
    try {
      this.increment();
      return await promise;
    } finally {
      this.decrement();
    }
  }

  /**
   * Wrap an async function and return a new function that tracks loading state.
   */
  wrapFunction<T extends unknown[], R>(
    operation: (...args: T) => Promise<R>
  ): (...args: T) => Promise<R> {
    return async (...args: T): Promise<R> => {
      try {
        this.increment();
        return await operation(...args);
      } finally {
        this.decrement();
      }
    };
  }

  /**
   * Manually increment the pending count.
   * Use with decrement() for fine-grained control.
   */
  increment(): void {
    this.internalStore.set(++this.pendingCount > 0);
  }

  /**
   * Manually decrement the pending count.
   * Use with increment() for fine-grained control.
   */
  decrement(): void {
    this.internalStore.set(--this.pendingCount > 0);
  }

  /**
   * Reset to not loading state.
   * Use with caution - mainly for error recovery.
   */
  reset(): void {
    this.pendingCount = 0;
    this.internalStore.set(false);
  }
}

/**
 * Global application loading store.
 * Use for operations that should block the entire UI.
 */
export const globalLoading = new IsLoadingStore();
