/**
 * Export Controller
 *
 * Orchestrates the snapshot export process:
 * 1. Fetches all locales
 * 2. For each locale: fetch data, serialize to FlatBuffers, write to disk
 * 3. Manages manifest.json for hash comparison (skip unchanged files)
 * 4. Provides progress reporting and cancellation support
 */

import { writable, type Readable } from 'svelte/store';
import { bridge } from '$lib/api/bridge.js';
import { snapshotExport } from '$lib/crud';
import { SnapshotDataFetcher } from './snapshot-data-fetcher.js';
import { serializeSnapshot } from './snapshot-serializer.js';
import type { ExportProgress, ExportResult, ExportManifest } from './types.js';

/**
 * Compute SHA-256 hash of binary data.
 */
async function computeHash(data: Uint8Array): Promise<string> {
  // Slice to get only the relevant portion and cast to ArrayBuffer
  // (FlatBuffers always uses regular ArrayBuffer, not SharedArrayBuffer)
  const buffer = data.buffer.slice(data.byteOffset, data.byteOffset + data.byteLength) as ArrayBuffer;
  const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Controller for managing snapshot exports.
 */
export class ExportController {
  private _fetcher: SnapshotDataFetcher | null = null;
  private _cancelled = false;
  private _isRunning = false;
  private _progressStore = writable<ExportProgress>({
    phase: 'complete',  // Start as 'complete' so isExporting is false initially
    totalLocales: 0,
    completedLocales: 0,
  });

  /**
   * Reactive store for export progress.
   */
  get progress(): Readable<ExportProgress> {
    return this._progressStore;
  }

  /**
   * Cancel the current export operation.
   * Note: The actual cancellation happens asynchronously when the export loop
   * checks the _cancelled flag. The _isRunning flag is reset in the finally block.
   */
  cancel(): void {
    this._cancelled = true;
    if (this._fetcher) {
      this._fetcher.cancel();
    }
    // Don't set phase to 'cancelled' here - let the export loop handle it
    // so that _isRunning is properly reset in the finally block
  }

  /**
   * Check if an export is currently running.
   */
  get isRunning(): boolean {
    return this._isRunning;
  }

  /**
   * Export all locales to the specified output path.
   *
   * Directory structure:
   * ```
   * outputPath/
   *   manifest.json
   *   locales/
   *     en.gsb
   *     fr.gsb
   *     ...
   * ```
   */
  async exportAll(outputPath: string): Promise<ExportResult> {
    // Prevent concurrent exports
    if (this._isRunning) {
      return {
        success: false,
        localesExported: 0,
        localesSkipped: 0,
        bytesWritten: 0,
        durationMs: 0,
        error: 'Export already in progress',
      };
    }

    const startTime = Date.now();
    this._cancelled = false;
    this._isRunning = true;

    // Track results - declared outside try block to preserve partial progress on error
    let totalLocales = 0;
    let localesExported = 0;
    let localesSkipped = 0;
    let bytesWritten = 0;

    try {
      // 1. Preparing phase
      this._progressStore.set({
        phase: 'preparing',
        totalLocales: 0,
        completedLocales: 0,
      });

      // Fetch all locales
      const locales = await snapshotExport.getAllLocales();
      if (this._cancelled) {
        return this.cancelledResult(startTime);
      }

      totalLocales = locales.length;
      this._progressStore.set({
        phase: 'preparing',
        totalLocales,
        completedLocales: 0,
      });

      // Ensure output directories exist
      await bridge.makeDirectory(outputPath);
      const localesDir = `${outputPath}/locales`;
      await bridge.makeDirectory(localesDir);

      // Load existing manifest for hash comparison
      const existingManifest = await this.loadManifest(outputPath);

      // Track hashes for manifest
      const newHashes: Record<string, string> = {};

      // 2. Process each locale
      for (let i = 0; i < locales.length; i++) {
        if (this._cancelled) {
          return this.cancelledResult(startTime);
        }

        const locale = locales[i];
        this._progressStore.set({
          phase: 'fetching',
          currentLocale: locale.name,
          totalLocales,
          completedLocales: i,
        });

        // Fetch data for this locale
        this._fetcher = new SnapshotDataFetcher();
        const snapshotData = await this._fetcher.fetchForLocale(locale);
        this._fetcher = null;

        if (this._cancelled) {
          return this.cancelledResult(startTime);
        }

        this._progressStore.set({
          phase: 'serializing',
          currentLocale: locale.name,
          totalLocales,
          completedLocales: i,
        });

        // Serialize to FlatBuffers
        const binaryData = serializeSnapshot(snapshotData);
        const hash = await computeHash(binaryData);
        newHashes[locale.name] = hash;

        // Check if unchanged
        if (existingManifest?.hashes[locale.name] === hash) {
          localesSkipped++;
          continue;
        }

        if (this._cancelled) {
          return this.cancelledResult(startTime);
        }

        this._progressStore.set({
          phase: 'writing',
          currentLocale: locale.name,
          totalLocales,
          completedLocales: i,
        });

        // Write to disk (atomic: write to temp, then rename)
        const filePath = `${localesDir}/${locale.name}.gsb`;
        const tempPath = `${filePath}.tmp`;

        await bridge.writeBinaryFile(tempPath, binaryData);
        await bridge.renameFile(tempPath, filePath);

        localesExported++;
        bytesWritten += binaryData.length;
      }

      if (this._cancelled) {
        return this.cancelledResult(startTime);
      }

      // 3. Write manifest
      const manifest: ExportManifest = {
        version: '1.0.0',
        locales: locales.map((l) => l.name),
        exportedAt: new Date().toISOString(),
        hashes: newHashes,
      };

      await bridge.writeFile(`${outputPath}/manifest.json`, JSON.stringify(manifest, null, 2));

      // 4. Complete
      const durationMs = Date.now() - startTime;
      this._progressStore.set({
        phase: 'complete',
        totalLocales,
        completedLocales: totalLocales,
      });

      return {
        success: true,
        localesExported,
        localesSkipped,
        bytesWritten,
        durationMs,
      };
    } catch (error) {
      const durationMs = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : String(error);

      this._progressStore.set({
        phase: 'error',
        totalLocales,
        completedLocales: localesExported + localesSkipped,
        error: errorMessage,
      });

      return {
        success: false,
        localesExported,
        localesSkipped,
        bytesWritten,
        durationMs,
        error: errorMessage,
      };
    } finally {
      this._isRunning = false;
    }
  }

  /**
   * Load existing manifest from disk if it exists.
   */
  private async loadManifest(outputPath: string): Promise<ExportManifest | null> {
    try {
      const manifestPath = `${outputPath}/manifest.json`;
      const exists = await bridge.fileExists(manifestPath);
      if (!exists) {
        return null;
      }

      const content = await bridge.readFile(manifestPath);
      return JSON.parse(content) as ExportManifest;
    } catch {
      // If manifest doesn't exist or is invalid, treat as fresh export
      return null;
    }
  }

  /**
   * Create a cancelled result and update progress store.
   */
  private cancelledResult(startTime: number): ExportResult {
    this._progressStore.set({
      phase: 'cancelled',
      totalLocales: 0,
      completedLocales: 0,
    });

    return {
      success: false,
      localesExported: 0,
      localesSkipped: 0,
      bytesWritten: 0,
      durationMs: Date.now() - startTime,
      error: 'Export cancelled',
    };
  }
}

/**
 * Singleton export controller instance.
 */
export const exportController = new ExportController();
