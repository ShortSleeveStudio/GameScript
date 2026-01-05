/**
 * Snapshot Export Module
 *
 * Exports dialogue data to FlatBuffers binary format for game engine consumption.
 */

export { exportController, ExportController } from './export-controller.js';
export { triggerSave } from './save-trigger.js';
export { SnapshotDataFetcher } from './snapshot-data-fetcher.js';
export { serializeSnapshot } from './snapshot-serializer.js';
export type {
  LocaleSnapshot,
  ExportConversation,
  ExportNode,
  ExportEdge,
  ExportActor,
  ExportLocalization,
  ExportPropertyTemplate,
  ExportNodeProperty,
  ExportProgress,
  ExportResult,
  ExportManifest,
} from './types.js';
