/**
 * Action and condition registry store.
 *
 * Tracks available actions and conditions discovered from scanning
 * C# source files for [DialogueAction] and [DialogueCondition] attributes.
 */

import { writable, derived, get, type Writable, type Readable } from 'svelte/store';
import { bridge } from '$lib/api/bridge.js';
import type { ScannedAction, ScannedCondition } from '@gamescript/shared';

// ============================================================================
// Types
// ============================================================================

export interface ActionCategory {
  name: string;
  actions: ScannedAction[];
}

export interface RegistryState {
  actions: ScannedAction[];
  conditions: ScannedCondition[];
  lastScanTime: Date | null;
  isScanning: boolean;
  scanError: string | null;
}

// ============================================================================
// Registry Store
// ============================================================================

const initialState: RegistryState = {
  actions: [],
  conditions: [],
  lastScanTime: null,
  isScanning: false,
  scanError: null,
};

const registryState: Writable<RegistryState> = writable(initialState);

/** Readable version for components */
export const registry: Readable<RegistryState> = { subscribe: registryState.subscribe };

// ============================================================================
// Derived Stores
// ============================================================================

/** All available actions */
export const actions: Readable<ScannedAction[]> = derived(
  registryState,
  ($state) => $state.actions
);

/** All available conditions */
export const conditions: Readable<ScannedCondition[]> = derived(
  registryState,
  ($state) => $state.conditions
);

/** Actions grouped by category */
export const actionsByCategory: Readable<ActionCategory[]> = derived(actions, ($actions) => {
  const categoryMap = new Map<string, ScannedAction[]>();

  for (const action of $actions) {
    const category = action.category || 'Uncategorized';
    if (!categoryMap.has(category)) {
      categoryMap.set(category, []);
    }
    categoryMap.get(category)!.push(action);
  }

  // Sort categories alphabetically, but keep "Uncategorized" last
  const categories: ActionCategory[] = [];
  const sortedKeys = Array.from(categoryMap.keys()).sort((a, b) => {
    if (a === 'Uncategorized') return 1;
    if (b === 'Uncategorized') return -1;
    return a.localeCompare(b);
  });

  for (const name of sortedKeys) {
    categories.push({
      name,
      actions: categoryMap.get(name)!.sort((a, b) => a.name.localeCompare(b.name)),
    });
  }

  return categories;
});

/** Whether registry has any actions */
export const hasActions: Readable<boolean> = derived(actions, ($actions) => $actions.length > 0);

/** Whether registry has any conditions */
export const hasConditions: Readable<boolean> = derived(
  conditions,
  ($conditions) => $conditions.length > 0
);

/** Whether a scan is in progress */
export const isScanning: Readable<boolean> = derived(
  registryState,
  ($state) => $state.isScanning
);

// ============================================================================
// Initialization
// ============================================================================

/**
 * Initialize the registry store and set up bridge listeners.
 */
export function initRegistryStore(): void {
  // Listen for registry updates from the extension
  bridge.on('registryUpdated', (newActions, newConditions) => {
    registryState.update((state) => ({
      ...state,
      actions: newActions,
      conditions: newConditions,
      lastScanTime: new Date(),
      isScanning: false,
      scanError: null,
    }));
  });

  bridge.on('error', (error) => {
    registryState.update((state) => ({
      ...state,
      isScanning: false,
      scanError: error,
    }));
  });
}

// ============================================================================
// Actions
// ============================================================================

/**
 * Request a scan of the workspace for actions and conditions.
 */
export function scanRegistry(): void {
  registryState.update((state) => ({
    ...state,
    isScanning: true,
    scanError: null,
  }));

  bridge.scanRegistry();
}

/**
 * Clear the registry.
 */
export function clearRegistry(): void {
  registryState.set(initialState);
}

// ============================================================================
// Lookup Functions
// ============================================================================

/**
 * Find an action by name.
 */
export function findAction(name: string): ScannedAction | undefined {
  return get(actions).find((a) => a.name === name);
}

/**
 * Find a condition by name.
 */
export function findCondition(name: string): ScannedCondition | undefined {
  return get(conditions).find((c) => c.name === name);
}

/**
 * Search actions by name (case-insensitive partial match).
 */
export function searchActions(query: string): ScannedAction[] {
  if (!query) return [];
  const lowerQuery = query.toLowerCase();

  return get(actions).filter(
    (a) =>
      a.name.toLowerCase().includes(lowerQuery) ||
      a.category.toLowerCase().includes(lowerQuery)
  );
}

/**
 * Search conditions by name (case-insensitive partial match).
 */
export function searchConditions(query: string): ScannedCondition[] {
  if (!query) return [];
  const lowerQuery = query.toLowerCase();

  return get(conditions).filter((c) => c.name.toLowerCase().includes(lowerQuery));
}
