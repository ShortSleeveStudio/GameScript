/**
 * Utilities for working with Svelte Flow node internals.
 * Ported from GameScriptElectron graph-temporary.ts.
 *
 * Updated for @xyflow/svelte 1.x API.
 */

import { useUpdateNodeInternals } from '@xyflow/svelte';

/**
 * Creates a Promise-based wrapper around useUpdateNodeInternals.
 *
 * Must be called at component initialization (not inside callbacks),
 * as it uses the useUpdateNodeInternals hook which requires SvelteFlow context.
 *
 * Returns a function that triggers node measurement and returns a Promise
 * that resolves after the browser has completed the DOM update (via requestAnimationFrame).
 *
 * @returns A function that takes node ID(s) and returns a Promise
 */
export function createUpdateNodeInternals(): (ids: string | string[]) => Promise<void> {
    const updateNodeInternals = useUpdateNodeInternals();

    return (ids: string | string[]): Promise<void> => {
        return new Promise((resolve) => {
            updateNodeInternals(ids);
            requestAnimationFrame(() => {
                resolve();
            });
        });
    };
}
