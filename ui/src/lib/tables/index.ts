/**
 * Shared table views.
 *
 * These singleton stores provide reactive views of database tables
 * that are commonly accessed throughout the application.
 */

export { actorsTable } from './actors.js';
export { codeOutputFolderTableView, getCodeOutputFolder } from './code-output-folder.js';
export { codeTemplateTableView, getCodeTemplate } from './code-template.js';
export { snapshotOutputPathTableView, getSnapshotOutputPath } from './snapshot-output-path.js';
export { conversationTagCategoriesTable, conversationTagValuesTable } from './conversation-tags.js';
export { localizationTagCategoriesTable, localizationTagValuesTable } from './localization-tags.js';
export { localesTable } from './locales.js';
export { localePrincipalTableView, getLocalePrincipal } from './locale-principal.js';
export { systemCreatedLocaleTableView, getSystemCreatedLocale } from './locale-system-created.js';
export { propertyTemplatesTable } from './property-templates.js';
