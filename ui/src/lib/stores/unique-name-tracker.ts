/**
 * UniqueNameTracker - Validates name uniqueness for entities.
 *
 * Used for actors, locales, and other entities that require unique names.
 * Caches names and validates in real-time as the user types.
 *
 * @example
 * ```svelte
 * <script lang="ts">
 *   import { UniqueNameTracker } from '$lib/stores/unique-name-tracker';
 *   import { getActors } from '$lib/crud/actors';
 *
 *   const nameTracker = new UniqueNameTracker();
 *
 *   onMount(async () => {
 *     const actors = await getActors();
 *     nameTracker.loadNames(actors.map(a => ({ id: a.id, name: a.name })));
 *   });
 *
 *   function validateName(id: number, name: string): string | null {
 *     return nameTracker.validate(id, name);
 *   }
 * </script>
 * ```
 */

import { writable, type Readable } from 'svelte/store';

// ============================================================================
// Types
// ============================================================================

export interface NameEntry {
  id: number;
  name: string;
}

export interface ValidationResult {
  valid: boolean;
  error: string | null;
}

// ============================================================================
// Implementation
// ============================================================================

export class UniqueNameTracker {
  // Map from lowercase name to ID (for case-insensitive uniqueness)
  private nameToId = new Map<string, number>();
  // Map from ID to original name (preserves case)
  private idToName = new Map<number, string>();
  // Version counter for reactivity - increments on any change
  private _version = writable(0);

  /**
   * Get a readable store that updates when names change.
   * Subscribe to this to be notified of changes, then call validation methods.
   */
  get changed(): Readable<number> {
    return this._version;
  }

  /**
   * Load names from an array of entries.
   * Replaces any existing tracked names.
   */
  loadNames(entries: NameEntry[]): void {
    this.nameToId.clear();
    this.idToName.clear();

    for (const entry of entries) {
      const lowerName = entry.name.toLowerCase();
      this.nameToId.set(lowerName, entry.id);
      this.idToName.set(entry.id, entry.name);
    }

    this.notifyChange();
  }

  /**
   * Add a new name to track.
   */
  addName(id: number, name: string): void {
    const lowerName = name.toLowerCase();
    this.nameToId.set(lowerName, id);
    this.idToName.set(id, name);
    this.notifyChange();
  }

  /**
   * Update an existing name.
   */
  updateName(id: number, newName: string): void {
    // Remove old name mapping
    const oldName = this.idToName.get(id);
    if (oldName) {
      this.nameToId.delete(oldName.toLowerCase());
    }

    // Add new name mapping
    const lowerName = newName.toLowerCase();
    this.nameToId.set(lowerName, id);
    this.idToName.set(id, newName);
    this.notifyChange();
  }

  /**
   * Remove a name from tracking.
   */
  removeName(id: number): void {
    const name = this.idToName.get(id);
    if (name) {
      this.nameToId.delete(name.toLowerCase());
      this.idToName.delete(id);
      this.notifyChange();
    }
  }

  /**
   * Check if a name is unique (excluding the given ID).
   *
   * @param id - ID of the entity being validated (excluded from check)
   * @param name - Name to check
   * @returns true if the name is unique
   */
  isUnique(id: number, name: string): boolean {
    const lowerName = name.toLowerCase();
    const existingId = this.nameToId.get(lowerName);
    return existingId === undefined || existingId === id;
  }

  /**
   * Check if a name already exists (for new entries).
   *
   * @param name - Name to check
   * @returns true if the name already exists
   */
  exists(name: string): boolean {
    return this.nameToId.has(name.toLowerCase());
  }

  /**
   * Validate a name and return an error message if invalid.
   *
   * @param id - ID of the entity (use -1 for new entries)
   * @param name - Name to validate
   * @returns Error message or null if valid
   */
  validate(id: number, name: string): string | null {
    // Check for empty name
    if (!name || name.trim().length === 0) {
      return 'Name cannot be empty';
    }

    // Check for uniqueness
    if (!this.isUnique(id, name)) {
      return 'Name already exists';
    }

    return null;
  }

  /**
   * Get full validation result.
   */
  validateWithResult(id: number, name: string): ValidationResult {
    const error = this.validate(id, name);
    return {
      valid: error === null,
      error,
    };
  }

  /**
   * Get the name for an ID.
   */
  getName(id: number): string | undefined {
    return this.idToName.get(id);
  }

  /**
   * Get the ID for a name.
   */
  getId(name: string): number | undefined {
    return this.nameToId.get(name.toLowerCase());
  }

  /**
   * Get the count of tracked names.
   */
  get count(): number {
    return this.idToName.size;
  }

  /**
   * Clear all tracked names.
   */
  clear(): void {
    this.nameToId.clear();
    this.idToName.clear();
    this.notifyChange();
  }

  /**
   * Generate a unique name by appending a number.
   *
   * @param baseName - The base name to start from
   * @returns A unique name like "baseName", "baseName 2", "baseName 3", etc.
   */
  generateUniqueName(baseName: string): string {
    if (!this.exists(baseName)) {
      return baseName;
    }

    let counter = 2;
    while (this.exists(`${baseName} ${counter}`)) {
      counter++;
    }

    return `${baseName} ${counter}`;
  }

  /**
   * Increment version to notify subscribers of a change.
   */
  private notifyChange(): void {
    this._version.update(v => v + 1);
  }
}

// ============================================================================
// Factory Functions
// ============================================================================

/**
 * Create a UniqueNameTracker pre-loaded with data.
 */
export function createNameTracker(entries: NameEntry[]): UniqueNameTracker {
  const tracker = new UniqueNameTracker();
  tracker.loadNames(entries);
  return tracker;
}
