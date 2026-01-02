# Snapshot Export Feature - Complete

This document tracked the work needed to complete the snapshot export feature. All phases are now complete.

## All Phases Complete

### Schema & Database (Previous Session)
- [x] Added `TABLE_SNAPSHOT_OUTPUT_PATH` constant (id: 24)
- [x] Added `SnapshotOutputPath` entity type
- [x] Added `snapshotOutputPathTable` definition
- [x] Added initialization SQL for singleton row
- [x] Created table view (`snapshotOutputPathTableView`)
- [x] Created CRUD (`setSnapshotOutputPath()` with undo support)

### UI Components (Previous Session)
- [x] Extracted `CodeFolderSelector.svelte` as reusable component
- [x] Created `SettingsPanel.svelte` with:
  - Snapshot output path configuration
  - Auto-export on focus loss checkbox (persisted to localStorage)
  - Code workspace path (reuses CodeFolderSelector)
  - "Export Now" button
- [x] Refactored `InspectorPanel.svelte` with:
  - Left button: Connection status/disconnect
  - Right button: Settings toggle
  - Mutually exclusive accordion panels

### Phase 1: Bridge Extensions
- [x] Added binary file operation message types to `shared/src/types/messages.ts`
- [x] Added bridge methods to `ui/src/lib/api/bridge.ts`
- [x] Added extension handlers to `plugins/vscode/src/handlers/file.ts`

### Phase 2: FlatBuffers Schema
- [x] Created FlatBuffers schema: `ui/src/lib/export/schema/snapshot.fbs`
- [x] Added `flatbuffers` npm dependency to UI package
- [x] Added `generate:flatbuffers` script to package.json
- [x] Generated TypeScript from schema

### Phase 3: Export Type Definitions
- [x] Created `ui/src/lib/export/types.ts` with:
  - `ExportConversation`, `ExportNode`, `ExportEdge`, `ExportActor`
  - `ExportLocalization`, `ExportPropertyTemplate`, `ExportNodeProperty`
  - `LocaleSnapshot`, `ExportProgress`, `ExportResult`, `ExportManifest`
  - `IdToIndexMaps`

### Phase 4: Data Fetcher
- [x] Created `ui/src/lib/crud/crud-export.ts` for database access
- [x] Created `ui/src/lib/export/snapshot-data-fetcher.ts`:
  - `fetchForLocale(locale): Promise<LocaleSnapshot>`
  - Uses CRUD module for all database access
  - Builds ID → index maps during fetch
  - Computes edge indices for nodes
  - Supports cancellation

### Phase 5: FlatBuffers Serializer
- [x] Created `ui/src/lib/export/snapshot-serializer.ts`:
  - `serializeSnapshot(data: LocaleSnapshot): Uint8Array`
  - Builds FlatBuffers from export data structures
  - Handles nested arrays (tag values via StringArray helper)
  - Handles property value unions (string/int/float/bool)

### Phase 6: Export Controller
- [x] Created `ui/src/lib/export/export-controller.ts`:
  - `exportAll(outputPath): Promise<ExportResult>`
  - Orchestrates: for each locale → fetch → serialize → write
  - Progress reporting via Svelte store
  - Cancellation support
  - Hash comparison using `manifest.json` (skip unchanged files)
  - Atomic writes: write to `.tmp`, then rename
  - Writes `manifest.json` with version, locales, timestamps, hashes

### Phase 7: UI Integration
- [x] Updated `SettingsPanel.svelte`:
  - Imports and uses `ExportController`
  - Shows progress during export
  - Cancel button during export
  - Success/error toast with stats

### Phase 8: Auto-Export on Blur
- [x] Updated `App.svelte`:
  - Listens for `window.addEventListener('blur', ...)`
  - Checks if auto-export enabled and path configured
  - Triggers export (debounced by 500ms to avoid rapid re-exports)
  - Cancels pending export on focus regain

---

## Architecture Decisions Made

### Export Logic Location
- **Decision**: Export logic lives in the **webview** (Svelte UI)
- **Rationale**: Cross-IDE reuse (VS Code, Rider, Visual Studio share the same webview)
- **Extension role**: Only handles file I/O (mkdir, writeBinary, rename)

### FlatBuffers Code Generation
- **Decision**: Commit `.fbs` schema only, generate TypeScript at build time
- **Rationale**: Generated code is verbose, schema is source of truth

### Hash Comparison Strategy
- **Decision**: Store hashes in `manifest.json`
- **Format**:
  ```json
  {
    "version": "1.0.0",
    "locales": ["en", "fr", "de"],
    "exported_at": "2025-01-15T10:30:00Z",
    "hashes": {
      "en": "sha256...",
      "fr": "sha256...",
      "de": "sha256..."
    }
  }
  ```
- **Benefit**: No `readBinaryFile` needed, clean Git history

### Auto-Export Trigger
- **Decision**: Use webview `blur` event with 500ms debounce
- **Rationale**: Simple, works for v1, cross-IDE compatible

---

## Files Created/Modified

### New Files (This Session)
- `ui/src/lib/export/types.ts` - Export type definitions
- `ui/src/lib/export/snapshot-data-fetcher.ts` - Data fetcher class
- `ui/src/lib/export/snapshot-serializer.ts` - FlatBuffers serializer
- `ui/src/lib/export/export-controller.ts` - Export orchestration
- `ui/src/lib/export/index.ts` - Module exports
- `ui/src/lib/crud/crud-export.ts` - Export CRUD operations

### Modified Files (This Session)
- `ui/src/lib/crud/index.ts` - Export new CRUD module
- `ui/src/lib/components/app/SettingsPanel.svelte` - Export UI integration
- `ui/src/lib/components/app/App.svelte` - Auto-export on blur

### Previous Sessions
- `shared/src/types/messages.ts` - Added 4 new message type pairs for file ops
- `ui/src/lib/api/bridge.ts` - Added 4 new file operation methods + handlers
- `ui/src/lib/export/schema/snapshot.fbs` - FlatBuffers schema
- `ui/package.json` - Added flatbuffers dep + generate script
- `plugins/vscode/src/handlers/file.ts` - Added 4 new file operation handlers
- `.gitignore` - Added ui/src/lib/export/generated/

---

## Output Directory Structure

```
outputPath/
  manifest.json           # Version, locale list, hashes
  locales/
    en.gsb               # Per-language FlatBuffers snapshot
    fr.gsb
    de.gsb
    ...
```
