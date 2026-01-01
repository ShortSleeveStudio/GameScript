# Tag System Code Review

## Files to Review

### Shared Types (`shared/src/types/entities.ts`)
```typescript
// Base interfaces for generic tag handling
export interface BaseTagCategory extends Row, Named {}
export interface BaseTagValue extends Row, Named {
  category_id: number;
}

// Concrete types
export interface ConversationTagCategory extends Row, Named {}
export interface ConversationTagValue extends Row, Named {
  category_id: number;
}
export interface LocalizationTagCategory extends Row, Named {}
export interface LocalizationTagValue extends Row, Named {
  category_id: number;
}
```

### CRUD Factory (`ui/src/lib/crud/crud-tag-factory.ts`)
- `createTagCategoryCrud<TCategory>()` - Generic factory for category CRUD
- `createTagValueCrud<TValue, TEntity>()` - Generic factory for value CRUD
- Handles column creation/deletion, FK cleanup, undo/redo

### CRUD Implementations
- `ui/src/lib/crud/crud-conversation-tag-categories.ts` (27 lines)
- `ui/src/lib/crud/crud-conversation-tag-values.ts` (27 lines)
- `ui/src/lib/crud/crud-localization-tag-categories.ts`
- `ui/src/lib/crud/crud-localization-tag-values.ts`

### Table Views (`ui/src/lib/tables/`)
- `conversation-tags.ts` - Exports `conversationTagCategoriesTable`, `conversationTagValuesTable`
- `localization-tags.ts` - Exports `localizationTagCategoriesTable`, `localizationTagValuesTable`

### Grid Components (`ui/src/lib/grid/`)
- `cell-renderer-tag.svelte.ts` - Displays tag value name, reactive via `$effect.root`
- `cell-editor-tag.svelte.ts` - Combobox dropdown with filter, keyboard nav

### UI Components
- `ui/src/lib/components/common/TagCategorySettingsPanel.svelte` - Expandable settings panel
- `ui/src/lib/components/common/GridToolbar.svelte` - Toolbar with expandable content support
- `ui/src/lib/components/inspector/InspectorTagCategory.svelte` - Inspector for category + values

### Panel Integrations
- `ui/src/lib/components/panels/ConversationFinder.svelte` - Tag columns with grouping + Set Filter
- `ui/src/lib/components/panels/LocalizationEditor.svelte` - Tag columns with grouping + Set Filter

---

## Review Checklist

### 1. Type Architecture
- [ ] Are `BaseTagCategory` and `BaseTagValue` necessary, or can we use the concrete types directly?
- [ ] Should concrete types extend the base types? Currently they're structurally identical but don't extend.
- [ ] Is there redundancy in having both base and concrete types when they're identical?

### 2. DRY Analysis

**Duplicated Code in Panels:**
Both `ConversationFinder.svelte` and `LocalizationEditor.svelte` contain nearly identical:
```typescript
// handleTagValueChange function (~15 lines each)
async function handleTagValueChange(rowId: number, columnName: string, valueId: number | null): Promise<void> {
  try {
    const row = await [crud].getById(rowId);
    if (!row) return;
    const newRow = { ...row } as any;
    newRow[columnName] = valueId;
    await [crud].updateOne(row, newRow as EntityType);
  } catch (err) {
    toastError('Failed to update tag', err);
  }
}

// Tag column building logic (~40 lines each)
if (categoryRowViews.length > 0) {
  const tagColumns: ColDef[] = [];
  for (const rowView of categoryRowViews) {
    // ... identical column definition structure
    tagColumns.push({ ... });
  }
  newColumnDefs.push({
    headerName: 'Tags',
    groupId: 'tags',
    children: tagColumns,
  });
}
```

**Questions:**
- [ ] Should `handleTagValueChange` be extracted to a shared utility?
- [ ] Should tag column building be extracted to a factory function?
- [ ] Could a higher-order component or composable handle tag integration?

### 3. Context Interfaces

**Current Pattern:**
```typescript
// cell-renderer-tag.svelte.ts
export interface TagCellRendererContext extends GridContext {
  getTagValuesTable: () => IDbTableView<BaseTagValue>;
}

// cell-editor-tag.svelte.ts
export interface TagCellEditorContext extends GridContext {
  getTagValuesTable: () => IDbTableView<BaseTagValue>;
  onTagValueChange: (rowId: number, columnName: string, valueId: number | null) => Promise<void>;
}
```

**Questions:**
- [ ] Should these interfaces be consolidated into one `TagGridContext`?
- [ ] Should these live in a shared types file rather than in the component files?
- [ ] The renderer and editor both need `getTagValuesTable()` - is the split correct?

### 4. Filter Implementation

**Current Set Filter Pattern:**
```typescript
filter: 'agSetColumnFilter',
filterParams: {
  values: (params: SetFilterValuesFuncParams) => {
    const values = categoryValues.map((v) => v.name);
    params.success(values);
  },
  cellRenderer: (params: { value: string }) => params.value || '(Empty)',
},
filterValueGetter: (params) => {
  if (!params.data) return null;
  const tagValueId = params.data.data[colId] as number | null;
  if (tagValueId == null) return null;
  const tagValue = categoryValues.find((v) => v.id === tagValueId);
  return tagValue?.name ?? null;
},
```

**Questions:**
- [ ] `categoryValues` is captured in a closure - will this update reactively when values change?
- [ ] Should null/empty values be included in the filter options?
- [ ] Is the O(n) find in filterValueGetter acceptable, or should we use a Map?

### 5. Reactivity Concerns

**In cell-renderer-tag.svelte.ts:**
```typescript
this.effectCleanup = $effect.root(() => {
  $effect(() => {
    // Accesses rowView.data and tagValuesTable.rows
  });
});
```

**Questions:**
- [ ] Is `$effect.root` the correct pattern for AG Grid cell renderers?
- [ ] Are there memory leak concerns with effect cleanup?
- [ ] Does the renderer properly update when tag values are renamed?

### 6. CRUD Factory Pattern

**Current:**
```typescript
// crud-tag-factory.ts exports factory functions
export function createTagCategoryCrud<TCategory>(config): TagCategoryCrud<TCategory>
export function createTagValueCrud<TValue, TEntity>(config): TagValueCrud<TValue>

// Usage in crud-conversation-tag-categories.ts
const crud = createTagCategoryCrud<ConversationTagCategory>({...});
export const getAll = crud.getAll;
export const getById = crud.getById;
// ... individual exports
```

**Questions:**
- [ ] Is re-exporting individual functions better than exporting the crud object?
- [ ] Should the factory return a class instance instead of an object literal?
- [ ] Is the generic type parameter necessary when the config already specifies tables?

### 7. Inspector Integration

**TagCategoryCrud interface in TagCategorySettingsPanel:**
```typescript
interface TagCategoryCrud {
    create: (name: string) => Promise<BaseTagCategory>;
    updateOne: (oldCategory: BaseTagCategory, newCategory: BaseTagCategory) => Promise<BaseTagCategory>;
    remove: (id: number) => Promise<void>;
}
```

**TagCrud interface in InspectorTagCategory:**
```typescript
interface TagCrud {
    createValue: (categoryId: number, name: string) => Promise<BaseTagValue>;
    updateValue: (oldValue: BaseTagValue, newValue: BaseTagValue) => Promise<BaseTagValue>;
    removeValue: (id: number) => Promise<void>;
}
```

**Questions:**
- [ ] These are local interfaces - should they be shared types?
- [ ] Naming inconsistency: `create` vs `createValue`, `updateOne` vs `updateValue`
- [ ] Should these match the factory-generated CRUD interfaces exactly?

### 8. Column ID Consistency

**Pattern:**
```typescript
// shared/src/types/constants.ts
export function tagCategoryIdToColumn(categoryId: number): string {
  return `tag_category_${categoryId}`;
}
```

**Questions:**
- [ ] Is this function exported and used consistently everywhere?
- [ ] Is there a reverse function `tagCategoryColumnToId()`? Is it needed?

### 9. Focus Management

**Current:**
```typescript
// In ConversationFinder/LocalizationEditor
import { focusConversationTagCategory, focusedConversationTagCategory } from '$lib/stores/focus.js';

// Usage
focusCategory={focusConversationTagCategory}
focusedCategoryId={$focusedConversationTagCategory}
```

**Questions:**
- [ ] Is passing both the function and the derived value the right pattern?
- [ ] Could this be simplified with a single store/context?

### 10. Potential Bugs

- [ ] In `cell-editor-tag.svelte.ts`, `handleFilterInput` re-fetches from table but doesn't use reactive tracking
- [ ] Column group `groupId: 'tags'` is hardcoded - will this conflict if we need multiple tag groups?
- [ ] `filterValueGetter` closure captures `categoryValues` at column definition time - may be stale

---

## Architecture Questions

1. **Should tag column definitions be generated by a shared factory?**
   Currently duplicated in both panels.

2. **Should context interfaces be unified and live in shared types?**
   `TagCellRendererContext`, `TagCellEditorContext`, `TagCellEditorParams`

3. **Is the base type abstraction (`BaseTagCategory`, `BaseTagValue`) valuable?**
   Or should components use the concrete types directly?

4. **Should the CRUD factory export patterns be standardized?**
   Currently exports individual functions; could export the object directly.

5. **Is the `$effect.root` pattern in AG Grid components correct?**
   Need to verify cleanup and memory management.