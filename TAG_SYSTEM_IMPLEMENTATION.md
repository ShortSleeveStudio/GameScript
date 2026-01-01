# Tag System Implementation Plan

This document details all changes needed to implement the tag system in GameScript. The tag system replaces the existing filter system for conversations and adds organizational tagging for localizations.

## Overview

Two independent tag systems:
1. **Conversation Tags** - Replaces the existing `filters` table and dynamic filter columns
2. **Localization Tags** - New feature for organizing non-dialogue localizations

Both follow the same pattern: tag categories with managed values, stored as dynamic columns on the entity tables.

---

## Progress Summary

### ✅ COMPLETED

#### Phase 1: Shared Infrastructure
- [x] Added 4 new table constants in `shared/src/types/constants.ts` (TABLE_CONVERSATION_TAG_CATEGORIES, TABLE_CONVERSATION_TAG_VALUES, TABLE_LOCALIZATION_TAG_CATEGORIES, TABLE_LOCALIZATION_TAG_VALUES)
- [x] Removed TABLE_FILTERS and renumbered all table IDs sequentially (0-23)
- [x] Added tag helper functions (`tagCategoryIdToColumn`, `tagCategoryColumnToId`, `isTagCategoryColumn`) in constants.ts
- [x] Added 4 new entity interfaces in `shared/src/types/entities.ts`
- [x] Updated `Conversation` and `Localization` interfaces to include dynamic tag columns
- [x] Removed `Filter` interface
- [x] Added 4 new table definitions in `shared/src/schema/tables.ts`
- [x] Removed `filtersTable`
- [x] Updated `allTables` array with proper dependency order
- [x] Shared package builds successfully

#### Phase 2a: Conversation Tag CRUD
- [x] Created `ui/src/lib/crud/crud-conversation-tag-categories.ts`
- [x] Created `ui/src/lib/crud/crud-conversation-tag-values.ts`

#### Phase 3a: Localization Tag CRUD
- [x] Created `ui/src/lib/crud/crud-localization-tag-categories.ts`
- [x] Created `ui/src/lib/crud/crud-localization-tag-values.ts`

#### CRUD Exports
- [x] Updated `ui/src/lib/crud/index.ts` to export new CRUD modules
- [x] Removed `filters` export from CRUD index
- [x] Deleted `ui/src/lib/crud/crud-filters.ts`

#### Table Views
- [x] Created `ui/src/lib/tables/conversation-tags.ts`
- [x] Created `ui/src/lib/tables/localization-tags.ts`
- [x] Updated `ui/src/lib/tables/index.ts` to export new table views
- [x] Deleted `ui/src/lib/tables/filters.ts`

#### Database Exports
- [x] Updated `ui/src/lib/db/index.ts` - removed TABLE_FILTERS, added 4 new tag table constants

#### Focus Store
- [x] Updated `ui/src/lib/stores/focus.ts` - removed TABLE_FILTERS import, removed FocusPayloadFilter, removed focusFilter function
- [x] Added `focusConversationTagCategory` and `focusedConversationTagCategory`
- [x] Added `focusLocalizationTagCategory` and `focusedLocalizationTagCategory`

#### Inspector Components
- [x] Updated `ui/src/lib/components/inspector/Inspector.svelte` - removed Filter import and InspectorFilter case
- [x] Updated `ui/src/lib/components/inspector/index.ts` - removed InspectorFilter export
- [x] Deleted `ui/src/lib/components/inspector/InspectorFilter.svelte`
- [x] Created generic `InspectorTagCategory.svelte` component (reusable for both conversation and localization tags)
- [x] Updated `Inspector.svelte` to handle both conversation and localization tag category focus

#### Common Components
- [x] Added selection support to `EditableList` and `EditableListItem` components
- [x] Created unified `TagCategorySettingsModal.svelte` component (reusable for both entity types)

#### Phase 2b & 2c: Conversation Finder Integration
- [x] Updated `ConversationFinder.svelte` to use tag categories instead of filters
  - Replaced `TABLE_FILTERS` with `TABLE_CONVERSATION_TAG_CATEGORIES`
  - Replaced `filters.filterIdToColumn` with `tagCategoryIdToColumn`
  - Replaced `filtersTable` with `conversationTagCategoriesTable`
  - Updated event handler from `onFilterDeleting` to `onTagCategoryDeleting`
- [x] Updated to use unified `TagCategorySettingsModal` component
- [x] Deleted old `ConversationFinderSettingsModal.svelte`
- [x] UI package builds successfully

#### Phase 3b & 3c: Localization Editor Integration
- [x] Updated `LocalizationEditor.svelte` to add tag columns and filtering
  - Added settings button to toolbar
  - Added dynamic tag category columns using `localizationTagCategoriesTable`
  - Updated to use unified `TagCategorySettingsModal` component
- [x] Deleted old `LocalizationEditorSettingsModal.svelte`

---

## File Changes Summary

### New Files Created

| Path | Status |
|------|--------|
| `ui/src/lib/crud/crud-conversation-tag-categories.ts` | ✅ Created |
| `ui/src/lib/crud/crud-conversation-tag-values.ts` | ✅ Created |
| `ui/src/lib/crud/crud-localization-tag-categories.ts` | ✅ Created |
| `ui/src/lib/crud/crud-localization-tag-values.ts` | ✅ Created |
| `ui/src/lib/tables/conversation-tags.ts` | ✅ Created |
| `ui/src/lib/tables/localization-tags.ts` | ✅ Created |
| `ui/src/lib/components/inspector/InspectorTagCategory.svelte` | ✅ Created (generic, reusable) |
| `ui/src/lib/components/common/TagCategorySettingsModal.svelte` | ✅ Created (unified for both entity types) |

### Modified Files

| Path | Status |
|------|--------|
| `shared/src/types/constants.ts` | ✅ Done |
| `shared/src/types/entities.ts` | ✅ Done |
| `shared/src/schema/tables.ts` | ✅ Done |
| `ui/src/lib/db/index.ts` | ✅ Done |
| `ui/src/lib/tables/index.ts` | ✅ Done |
| `ui/src/lib/crud/index.ts` | ✅ Done |
| `ui/src/lib/stores/focus.ts` | ✅ Done (added tag category focus support for both types) |
| `ui/src/lib/components/inspector/Inspector.svelte` | ✅ Done (added both tag category cases) |
| `ui/src/lib/components/inspector/index.ts` | ✅ Done (exports InspectorTagCategory) |
| `ui/src/lib/components/common/EditableList.svelte` | ✅ Done (added selection support) |
| `ui/src/lib/components/common/EditableListItem.svelte` | ✅ Done (added selection support) |
| `ui/src/lib/components/common/index.ts` | ✅ Done (exports TagCategorySettingsModal) |
| `ui/src/lib/components/panels/ConversationFinder.svelte` | ✅ Done |
| `ui/src/lib/components/panels/LocalizationEditor.svelte` | ✅ Done |

### Deleted Files

| Path | Status |
|------|--------|
| `ui/src/lib/crud/crud-filters.ts` | ✅ Deleted |
| `ui/src/lib/tables/filters.ts` | ✅ Deleted |
| `ui/src/lib/components/inspector/InspectorFilter.svelte` | ✅ Deleted |
| `ui/src/lib/components/panels/ConversationFinderSettingsModal.svelte` | ✅ Deleted (replaced by unified TagCategorySettingsModal) |
| `ui/src/lib/components/panels/LocalizationEditorSettingsModal.svelte` | ✅ Deleted (replaced by unified TagCategorySettingsModal) |

---

## Architecture Notes

### Tag Column Pattern

Tag columns on entity tables follow the pattern `tag_category_{id}` where `{id}` is the tag category ID. The column value is either:
- `null` - No tag assigned for this category
- An integer FK to the tag values table

### Helper Functions (in shared/src/types/constants.ts)

```typescript
tagCategoryIdToColumn(categoryId: number): string  // -> "tag_category_123"
tagCategoryColumnToId(column: string): number | null  // "tag_category_123" -> 123
isTagCategoryColumn(column: string): boolean  // checks if column matches pattern
```

### Table IDs (sequential, 0-23)

```
0-5: Core system tables
6: conversations
7-8: locales, locale_principal
9: localizations
10-11: actors, actor_principal
12-13: nodes, edges
14-15: version, notifications
16-18: property_types, property_templates, node_properties
19: code_output_folder
20-21: conversation_tag_categories, conversation_tag_values
22-23: localization_tag_categories, localization_tag_values
```

### Unified Components

The tag system uses two reusable components to avoid duplication:

1. **`InspectorTagCategory.svelte`** - Generic inspector panel for viewing/editing a tag category and its values. Works with any tag category type via props.

2. **`TagCategorySettingsModal.svelte`** - Unified settings modal for managing tag categories. Accepts CRUD operations, table view, and focus functions as props to work with any entity type.
