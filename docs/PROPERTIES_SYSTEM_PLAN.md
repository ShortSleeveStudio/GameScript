# Properties System Enhancement Plan

## Overview

This document outlines the plan to enhance GameScript's properties system with:

1. **Property Values**: Predefined values for property templates (optional suggestions)
2. **Reference Support**: Properties can reference predefined values OR use custom values
3. **Conversation Properties**: Extend properties to conversations (currently only nodes have properties)
4. **UI Improvements**: Replace GraphSettingsModal with expandable accordion panel for consistency

## Background & Motivation

### Current State

- **Node Properties**: Nodes can have arbitrary properties based on templates
- **Property Templates**: Define name + type (string/integer/decimal/boolean)
- **Values**: Always freeform - users type whatever they want

### Problem

- No way to define a constrained vocabulary for properties
- Users may accidentally use inconsistent values ("happy" vs "Happy" vs "joyful")
- No referential integrity - renaming a value requires manual updates everywhere

### Solution

Add optional **predefined values** for property templates. Properties can either:
- **Reference** a predefined value (FK to property_values table)
- **Use custom** freeform value (existing behavior)

When referencing, renaming the predefined value automatically updates everywhere.

---

## Schema Changes

### New Tables

#### `property_values`

Stores predefined values for property templates.

```sql
CREATE TABLE property_values (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  template_id INTEGER NOT NULL REFERENCES property_templates(id) ON DELETE CASCADE,
  value_string TEXT,
  value_integer INTEGER,
  value_decimal REAL,
  value_boolean INTEGER  -- SQLite stores booleans as 0/1
);
```

**Notes:**
- `ON DELETE CASCADE`: Deleting a template deletes all its predefined values
- Only one value column is used per row (based on template's type)

#### `conversation_properties`

Mirrors `node_properties` structure for conversations.

```sql
CREATE TABLE conversation_properties (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  parent INTEGER NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  template INTEGER NOT NULL REFERENCES property_templates(id) ON DELETE CASCADE,
  is_reference INTEGER NOT NULL DEFAULT 0,
  reference_value INTEGER REFERENCES property_values(id) ON DELETE SET NULL,
  value_string TEXT,
  value_integer INTEGER,
  value_decimal REAL,
  value_boolean INTEGER
);
```

### Modified Tables

#### `node_properties` (add columns)

```sql
ALTER TABLE node_properties ADD COLUMN is_reference INTEGER NOT NULL DEFAULT 0;
ALTER TABLE node_properties ADD COLUMN reference_value INTEGER REFERENCES property_values(id) ON DELETE SET NULL;
```

#### `property_templates` (conceptual change only)

The `parent` field currently references `TABLE_NODES.id` to indicate "this template is for nodes."

For conversation properties, we'll create templates with `parent = TABLE_CONVERSATIONS.id`.

**No schema change needed** - the `parent` field already supports this.

---

## Type Definitions

### File: `shared/src/types/constants.ts`

Add new table references:

```typescript
// After TABLE_CODE_TEMPLATE (id: 25)
export const TABLE_PROPERTY_VALUES: TableRef = { id: 26, name: 'property_values' };
export const TABLE_CONVERSATION_PROPERTIES: TableRef = { id: 27, name: 'conversation_properties' };

// Add to DATABASE_TABLES array
```

### File: `shared/src/types/entities.ts`

Add new entity interfaces:

```typescript
///
/// Property Values (predefined values for templates)
///
export interface PropertyValue extends Row {
  template_id: number; // FK PropertyTemplate
  value_string: string | null;
  value_integer: number | null;
  value_decimal: number | null;
  value_boolean: boolean | null;
}

///
/// Conversation Properties
///
export interface ConversationProperty extends Row {
  parent: number; // FK Conversation
  template: number; // FK PropertyTemplate
  is_reference: boolean;
  reference_value: number | null; // FK PropertyValue (nullable)
  value_string: string | null;
  value_integer: number | null;
  value_decimal: number | null;
  value_boolean: boolean | null;
}
```

Update `NodeProperty` interface:

```typescript
export interface NodeProperty extends Row {
  parent: number; // FK Node
  template: number; // FK PropertyTemplate
  is_reference: boolean;           // NEW
  reference_value: number | null;  // NEW - FK PropertyValue
  value_string: string | null;
  value_integer: number | null;
  value_decimal: number | null;
  value_boolean: boolean | null;
}
```

### File: `shared/src/schema/tables.ts`

Add table definitions:

```typescript
export const propertyValuesTable: TableDefinition = {
  name: TABLE_PROPERTY_VALUES.name,
  columns: [
    { name: 'id', type: 'INTEGER', primaryKey: true, autoIncrement: true },
    { name: 'template_id', type: 'INTEGER', notNull: true, references: { table: 'property_templates', column: 'id' } },
    { name: 'value_string', type: 'TEXT' },
    { name: 'value_integer', type: 'INTEGER' },
    { name: 'value_decimal', type: 'REAL' },
    { name: 'value_boolean', type: 'BOOLEAN' },
  ],
};

export const conversationPropertiesTable: TableDefinition = {
  name: TABLE_CONVERSATION_PROPERTIES.name,
  columns: [
    { name: 'id', type: 'INTEGER', primaryKey: true, autoIncrement: true },
    { name: 'parent', type: 'INTEGER', notNull: true, references: { table: 'conversations', column: 'id' } },
    { name: 'template', type: 'INTEGER', notNull: true, references: { table: 'property_templates', column: 'id' } },
    { name: 'is_reference', type: 'BOOLEAN', notNull: true, defaultValue: false },
    { name: 'reference_value', type: 'INTEGER', references: { table: 'property_values', column: 'id' } },
    { name: 'value_string', type: 'TEXT' },
    { name: 'value_integer', type: 'INTEGER' },
    { name: 'value_decimal', type: 'REAL' },
    { name: 'value_boolean', type: 'BOOLEAN' },
  ],
};
```

Update `nodePropertiesTable` to add new columns:

```typescript
export const nodePropertiesTable: TableDefinition = {
  name: TABLE_NODE_PROPERTIES.name,
  columns: [
    { name: 'id', type: 'INTEGER', primaryKey: true, autoIncrement: true },
    { name: 'parent', type: 'INTEGER', notNull: true, references: { table: 'nodes', column: 'id' } },
    { name: 'template', type: 'INTEGER', notNull: true, references: { table: 'property_templates', column: 'id' } },
    { name: 'is_reference', type: 'BOOLEAN', notNull: true, defaultValue: false },  // NEW
    { name: 'reference_value', type: 'INTEGER', references: { table: 'property_values', column: 'id' } },  // NEW
    { name: 'value_string', type: 'TEXT' },
    { name: 'value_integer', type: 'INTEGER' },
    { name: 'value_decimal', type: 'REAL' },
    { name: 'value_boolean', type: 'BOOLEAN' },
  ],
};
```

Update `allTables` array to include new tables in correct dependency order.

---

## CRUD Operations

### File: `ui/src/lib/crud/crud-property-values.ts` (NEW)

```typescript
import { db } from '$lib/db';
import { registerUndoable, Undoable } from '$lib/undo';
import {
  query,
  type PropertyValue,
  type PropertyTemplate,
  TABLE_PROPERTY_VALUES,
  PROPERTY_TYPE_STRING,
  PROPERTY_TYPE_INTEGER,
  PROPERTY_TYPE_DECIMAL,
  PROPERTY_TYPE_BOOLEAN,
} from '@gamescript/shared';

export interface CreatePropertyValueParams {
  template_id: number;
  value_string?: string;
  value_integer?: number;
  value_decimal?: number;
  value_boolean?: boolean;
}

export async function getAll(): Promise<PropertyValue[]> {
  return db.select<PropertyValue>(TABLE_PROPERTY_VALUES, query<PropertyValue>().build());
}

export async function getByTemplate(templateId: number): Promise<PropertyValue[]> {
  return db.select<PropertyValue>(
    TABLE_PROPERTY_VALUES,
    query<PropertyValue>().where('template_id').eq(templateId).build()
  );
}

export async function create(params: CreatePropertyValueParams): Promise<PropertyValue> {
  const value = await db.insert<PropertyValue>(TABLE_PROPERTY_VALUES, {
    template_id: params.template_id,
    value_string: params.value_string ?? null,
    value_integer: params.value_integer ?? null,
    value_decimal: params.value_decimal ?? null,
    value_boolean: params.value_boolean ?? null,
  });

  const capturedValue = { ...value };

  registerUndoable(
    new Undoable(
      'Create property value',
      async () => {
        await db.delete(TABLE_PROPERTY_VALUES, capturedValue.id);
      },
      async () => {
        await db.insertWithId<PropertyValue>(TABLE_PROPERTY_VALUES, capturedValue);
      }
    )
  );

  return value;
}

export async function updateOne(
  oldValue: PropertyValue,
  newValue: PropertyValue
): Promise<PropertyValue> {
  const result = await db.updateRow<PropertyValue>(TABLE_PROPERTY_VALUES, newValue);

  registerUndoable(
    new Undoable(
      'Update property value',
      async () => {
        await db.updateRow(TABLE_PROPERTY_VALUES, oldValue);
      },
      async () => {
        await db.updateRow(TABLE_PROPERTY_VALUES, newValue);
      }
    )
  );

  return result;
}

export async function remove(valueId: number): Promise<void> {
  // Note: ON DELETE SET NULL on reference_value handles cleanup
  // Properties referencing this value will have reference_value set to null
  // UI should detect is_reference=true + reference_value=null as "broken reference"
  await db.delete(TABLE_PROPERTY_VALUES, valueId);
  // Not undoable - user confirms via modal
}

/**
 * Get the display value for a PropertyValue based on its template type.
 */
export function getDisplayValue(value: PropertyValue, templateType: number): string {
  switch (templateType) {
    case PROPERTY_TYPE_STRING.id:
      return value.value_string ?? '';
    case PROPERTY_TYPE_INTEGER.id:
      return value.value_integer?.toString() ?? '';
    case PROPERTY_TYPE_DECIMAL.id:
      return value.value_decimal?.toString() ?? '';
    case PROPERTY_TYPE_BOOLEAN.id:
      return value.value_boolean ? 'Yes' : 'No';
    default:
      return '';
  }
}
```

### File: `ui/src/lib/crud/crud-conversation-properties.ts` (NEW)

Similar structure to `crud-node-properties.ts`, but for conversations:

```typescript
import { db } from '$lib/db';
import { registerUndoable, Undoable } from '$lib/undo';
import {
  type ConversationProperty,
  TABLE_CONVERSATION_PROPERTIES,
} from '@gamescript/shared';

export interface CreateConversationPropertyParams {
  parent: number;
  template: number;
  is_reference?: boolean;
  reference_value?: number | null;
  value_string?: string;
  value_integer?: number;
  value_decimal?: number;
  value_boolean?: boolean;
}

// ... similar CRUD operations as node-properties
```

### File: `ui/src/lib/crud/crud-node-properties.ts` (UPDATE)

Update `CreateNodePropertyParams` and `create` function:

```typescript
export interface CreateNodePropertyParams {
  parent: number;
  template: number;
  is_reference?: boolean;           // NEW
  reference_value?: number | null;  // NEW
  value_string?: string;
  value_integer?: number;
  value_decimal?: number;
  value_boolean?: boolean;
}

export async function create(params: CreateNodePropertyParams): Promise<NodeProperty> {
  const nodeProperty = await db.insert<NodeProperty>(
    TABLE_NODE_PROPERTIES,
    {
      parent: params.parent,
      template: params.template,
      is_reference: params.is_reference ?? false,         // NEW
      reference_value: params.reference_value ?? null,    // NEW
      value_string: params.value_string ?? '',
      value_integer: params.value_integer ?? 0,
      value_decimal: params.value_decimal ?? 0,
      value_boolean: params.value_boolean ?? false,
    }
  );
  // ... rest of function
}
```

### File: `ui/src/lib/crud/index.ts` (UPDATE)

Add exports:

```typescript
export * as propertyValues from './crud-property-values.js';
export * as conversationProperties from './crud-conversation-properties.js';
```

---

## Table Views

### File: `ui/src/lib/tables/property-values.ts` (NEW)

```typescript
import { query, TABLE_PROPERTY_VALUES, type PropertyValue } from '@gamescript/shared';
import { common } from '$lib/crud';

export const propertyValuesTable = common.fetchTable<PropertyValue>(
  TABLE_PROPERTY_VALUES,
  query<PropertyValue>().orderBy('id', 'ASC').build()
);
```

### File: `ui/src/lib/tables/index.ts` (UPDATE)

```typescript
export { propertyValuesTable } from './property-values.js';
```

---

## UI Components

### Component: `RowColumnProperties.svelte` (UPDATE)

Major update to support reference values with combobox UI:

```svelte
<script lang="ts">
  // ... existing imports
  import { propertyValuesTable } from '$lib/tables/property-values.js';
  import Combobox from './Combobox.svelte';

  // ... existing code

  // Get predefined values for a template
  function getValuesForTemplate(templateId: number): PropertyValue[] {
    return propertyValuesTable.rows
      .filter(v => v.data.template_id === templateId)
      .map(v => v.data);
  }

  // Determine if property has broken reference
  function isBrokenReference(property: NodeProperty): boolean {
    return property.is_reference && property.reference_value === null;
  }

  // Get current value (handles both reference and custom)
  function getCurrentValue(property: NodeProperty): { display: string; isReference: boolean } {
    if (property.is_reference) {
      if (property.reference_value === null) {
        return { display: '(Deleted value)', isReference: true };
      }
      const refValue = propertyValuesTable.getRowById(property.reference_value);
      if (!refValue) {
        return { display: '(Loading...)', isReference: true };
      }
      const templateType = getTemplateType(property.template);
      return {
        display: getDisplayValue(refValue.data, templateType),
        isReference: true
      };
    }
    return { display: formatValue(getPropertyValue(property)), isReference: false };
  }

  // Handle value selection from combobox
  async function handleValueSelect(
    propertyRowView: IDbRowView<NodeProperty>,
    selection: { isReference: boolean; referenceId?: number; customValue?: string }
  ): Promise<void> {
    const oldProperty = propertyRowView.getValue();
    const newProperty = { ...oldProperty };

    if (selection.isReference && selection.referenceId) {
      newProperty.is_reference = true;
      newProperty.reference_value = selection.referenceId;
      // Clear custom values when using reference
      newProperty.value_string = null;
      newProperty.value_integer = null;
      newProperty.value_decimal = null;
      newProperty.value_boolean = null;
    } else {
      newProperty.is_reference = false;
      newProperty.reference_value = null;
      // Set custom value based on type
      // ... type-specific assignment
    }

    await isLoading.wrapPromise(
      nodeProperties.updateOne(oldProperty, newProperty)
    );
  }
</script>

<!-- In template -->
{#each propertyList as propRowView (propRowView.id)}
  {@const property = propRowView.data}
  {@const template = templateMap.get(property.template)}
  {@const predefinedValues = getValuesForTemplate(property.template)}
  {@const isBroken = isBrokenReference(property)}

  <div class="property-row" class:broken={isBroken}>
    <span class="property-name">{template?.name ?? 'Unknown'}</span>

    {#if isBroken}
      <span class="broken-warning" title="Referenced value was deleted">
        (Value deleted - select new value)
      </span>
    {/if}

    {#if predefinedValues.length > 0}
      <!-- Combobox: dropdown with predefined values + custom input option -->
      <Combobox
        options={predefinedValues}
        value={getCurrentValue(property)}
        templateType={template?.type}
        onselect={(selection) => handleValueSelect(propRowView, selection)}
        disabled={$isLoading}
      />
    {:else}
      <!-- Freeform input (existing behavior) -->
      <!-- ... existing input code -->
    {/if}

    <Button variant="ghost" ... onclick={() => deleteProperty(propRowView.id)}>
      ×
    </Button>
  </div>
{/each}
```

### Component: `Combobox.svelte` (NEW)

A combobox that allows selecting from predefined values OR entering custom values:

```svelte
<script lang="ts">
  import type { PropertyValue } from '@gamescript/shared';
  import { getDisplayValue } from '$lib/crud/crud-property-values.js';

  interface Props {
    options: PropertyValue[];
    value: { display: string; isReference: boolean };
    templateType: number;
    disabled?: boolean;
    onselect: (selection: {
      isReference: boolean;
      referenceId?: number;
      customValue?: string
    }) => void;
  }

  let { options, value, templateType, disabled = false, onselect }: Props = $props();

  let isOpen = $state(false);
  let customInput = $state('');
  let showCustomInput = $state(false);

  function selectPredefined(option: PropertyValue) {
    onselect({ isReference: true, referenceId: option.id });
    isOpen = false;
  }

  function selectCustom() {
    onselect({ isReference: false, customValue: customInput });
    isOpen = false;
    showCustomInput = false;
  }
</script>

<div class="combobox">
  <button class="combobox-trigger" onclick={() => isOpen = !isOpen} {disabled}>
    {value.display}
    {#if value.isReference}
      <span class="reference-badge" title="Predefined value">*</span>
    {/if}
  </button>

  {#if isOpen}
    <div class="combobox-dropdown">
      {#each options as option (option.id)}
        <button
          class="combobox-option"
          onclick={() => selectPredefined(option)}
        >
          {getDisplayValue(option, templateType)}
        </button>
      {/each}

      <div class="combobox-divider"></div>

      {#if showCustomInput}
        <div class="custom-input-row">
          <input
            type="text"
            bind:value={customInput}
            placeholder="Enter custom value..."
          />
          <button onclick={selectCustom}>Use</button>
        </div>
      {:else}
        <button class="combobox-option custom" onclick={() => showCustomInput = true}>
          Custom value...
        </button>
      {/if}
    </div>
  {/if}
</div>
```

### Component: `PropertyValuesList.svelte` (NEW)

For managing predefined values in the settings panel:

```svelte
<script lang="ts">
  import type { PropertyTemplate, PropertyValue } from '@gamescript/shared';
  import type { IDbRowView } from '$lib/db';
  import { propertyValues } from '$lib/crud';
  import EditableList from './EditableList.svelte';

  interface Props {
    template: IDbRowView<PropertyTemplate>;
    values: IDbRowView<PropertyValue>[];
  }

  let { template, values }: Props = $props();

  async function handleAdd() {
    await propertyValues.create({
      template_id: template.id,
      // Default value based on type
    });
  }

  async function handleRename(payload: { rowView: IDbRowView<PropertyValue>; name: string }) {
    // Update the appropriate value field based on template type
  }

  async function handleDelete(payload: { rowView: IDbRowView<PropertyValue> }) {
    await propertyValues.remove(payload.rowView.id);
  }
</script>

<EditableList
  title="Predefined Values"
  description="Optional predefined values for this property. Users can select from these or enter custom values."
  rowViews={values}
  isConnected={true}
  emptyText="No predefined values. Users will enter values manually."
  addButtonLabel="+ Add Value"
  deleteModalTitle="Delete Value?"
  deleteModalText="Properties using this value will show as 'deleted' until updated."
  onadd={handleAdd}
  onrename={handleRename}
  ondelete={handleDelete}
/>
```

### Settings Panel: Replace Modal with Accordion

#### File: `ConversationEditor.svelte` (UPDATE)

Replace `GraphSettingsModal` with inline expandable panel:

```svelte
<script lang="ts">
  // ... existing imports
  import PropertySettingsPanel from '$lib/components/common/PropertySettingsPanel.svelte';

  let settingsExpanded = $state(false);
</script>

<!-- In toolbar area -->
<ToggleButton
  active={settingsExpanded}
  onclick={() => settingsExpanded = !settingsExpanded}
  title="Property Settings"
>
  <IconSettings size={16} />
</ToggleButton>

<!-- Expandable settings panel -->
{#if settingsExpanded}
  <PropertySettingsPanel
    entityTable={TABLE_NODES}
    entityName="nodes"
    onclose={() => settingsExpanded = false}
  />
{/if}
```

#### Component: `PropertySettingsPanel.svelte` (NEW)

Unified settings panel for property templates and their values:

```svelte
<script lang="ts">
  import type { PropertyTemplate } from '@gamescript/shared';
  import type { TableRef, IDbRowView } from '$lib/db';
  import { propertyTemplatesTable, propertyValuesTable } from '$lib/tables';
  import { propertyTemplates as templatesCrud, propertyValues as valuesCrud } from '$lib/crud';
  import EditableList from './EditableList.svelte';
  import PropertyValuesList from './PropertyValuesList.svelte';
  import { PROPERTY_TYPES, PROPERTY_TYPE_STRING } from '@gamescript/shared';

  interface Props {
    entityTable: TableRef; // TABLE_NODES or TABLE_CONVERSATIONS
    entityName: string;
    onclose?: () => void;
  }

  let { entityTable, entityName, onclose }: Props = $props();

  // Filter templates for this entity type
  let templates = $derived(
    propertyTemplatesTable.rows.filter(t => t.data.parent === entityTable.id)
  );

  // Currently selected template for value management
  let selectedTemplateId: number | null = $state(null);
  let selectedTemplate = $derived(
    selectedTemplateId ? propertyTemplatesTable.getRowById(selectedTemplateId) : null
  );

  // Values for selected template
  let selectedTemplateValues = $derived(
    selectedTemplateId
      ? propertyValuesTable.rows.filter(v => v.data.template_id === selectedTemplateId)
      : []
  );

  // ... handlers for add/rename/delete templates
  // ... handlers for selecting template to manage values
</script>

<div class="settings-panel">
  <div class="panel-header">
    <h3>{entityName === 'nodes' ? 'Node' : 'Conversation'} Properties</h3>
    <button onclick={onclose}>&times;</button>
  </div>

  <div class="panel-content">
    <EditableList
      title="Property Templates"
      description="Define properties that can be added to {entityName}."
      rowViews={templates}
      showType={true}
      typeOptions={PROPERTY_TYPES.map(t => ({ id: t.id, name: t.name }))}
      selectable={true}
      selectedId={selectedTemplateId}
      onadd={handleAddTemplate}
      onrename={handleRenameTemplate}
      ontypeChange={handleTemplateTypeChange}
      ondelete={handleDeleteTemplate}
      onselect={(payload) => selectedTemplateId = payload.rowView.id}
    />

    {#if selectedTemplate}
      <div class="values-section">
        <PropertyValuesList
          template={selectedTemplate}
          values={selectedTemplateValues}
        />
      </div>
    {/if}
  </div>
</div>
```

---

## Inspector Updates

### File: `InspectorNode.svelte` (NO CHANGE NEEDED)

The existing `RowColumnProperties` component will handle the new functionality.

### File: `InspectorConversation.svelte` (UPDATE)

Add properties section:

```svelte
<script lang="ts">
  // ... existing imports
  import RowColumnConversationProperties from '$lib/components/common/RowColumnConversationProperties.svelte';
  import { propertyTemplatesTable } from '$lib/tables';
  import { TABLE_CONVERSATIONS } from '@gamescript/shared';

  // Check if there are conversation property templates
  let hasConversationPropertyTemplates = $derived(
    propertyTemplatesTable.rows.some(t => t.data.parent === TABLE_CONVERSATIONS.id)
  );
</script>

<!-- After existing fields -->
{#if hasConversationPropertyTemplates}
  <InspectorField label="Properties">
    <RowColumnConversationProperties rowView={conversationRowView} />
  </InspectorField>
{/if}
```

### Component: `RowColumnConversationProperties.svelte` (NEW)

Clone of `RowColumnProperties.svelte` but for conversations:

```svelte
<!-- Same structure as RowColumnProperties.svelte but uses:
  - TABLE_CONVERSATION_PROPERTIES instead of TABLE_NODE_PROPERTIES
  - conversationProperties CRUD instead of nodeProperties
  - Filters templates by parent === TABLE_CONVERSATIONS.id
-->
```

---

## Migration Strategy

### For Existing Databases

Add columns to `node_properties`:

```sql
ALTER TABLE node_properties ADD COLUMN is_reference INTEGER NOT NULL DEFAULT 0;
ALTER TABLE node_properties ADD COLUMN reference_value INTEGER REFERENCES property_values(id);
```

Create new tables:

```sql
-- property_values table (run after property_templates exists)
CREATE TABLE property_values (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  template_id INTEGER NOT NULL REFERENCES property_templates(id) ON DELETE CASCADE,
  value_string TEXT,
  value_integer INTEGER,
  value_decimal REAL,
  value_boolean INTEGER
);

-- conversation_properties table
CREATE TABLE conversation_properties (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  parent INTEGER NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  template INTEGER NOT NULL REFERENCES property_templates(id) ON DELETE CASCADE,
  is_reference INTEGER NOT NULL DEFAULT 0,
  reference_value INTEGER REFERENCES property_values(id) ON DELETE SET NULL,
  value_string TEXT,
  value_integer INTEGER,
  value_decimal REAL,
  value_boolean INTEGER
);
```

### Migration Detection

Add version check in schema initialization or create a migrations table to track applied migrations.

---

## Reactivity Model Integration

### How It Works

1. **Property Templates Table**: Global singleton (`propertyTemplatesTable`)
   - All templates loaded at startup
   - Components filter by `parent` field (nodes vs conversations)

2. **Property Values Table**: Global singleton (`propertyValuesTable`)
   - All predefined values loaded at startup
   - Components filter by `template_id`

3. **Node/Conversation Properties**: Per-entity table view
   - Created in `RowColumnProperties` component
   - Filtered by `parent = entityId`
   - Released on component destroy

4. **Reference Resolution**:
   - When `is_reference = true`, look up value from `propertyValuesTable`
   - Reading `refValue.data.value_string` establishes reactive dependency
   - When predefined value is renamed, all properties displaying it auto-update

### Data Flow Example

```
User renames predefined value "Happy" to "Joyful"
  ↓
propertyValues.updateOne(old, new)
  ↓
db.updateRow() → triggers notification
  ↓
propertyValuesTable row view updates (#data = $state)
  ↓
All components reading that row's .data re-render
  ↓
Properties referencing that value show "Joyful"
```

---

## Implementation Order & Progress

### Phase 1: Schema & Types ✅ COMPLETE
1. ✅ Add `TABLE_PROPERTY_VALUES` and `TABLE_CONVERSATION_PROPERTIES` to constants
2. ✅ Add `PropertyValue` and `ConversationProperty` interfaces to entities
3. ✅ Add table definitions to schema/tables.ts
4. ✅ Update `NodeProperty` interface with new fields
5. ✅ Update `nodePropertiesTable` definition with new columns

**Files modified:**
- `shared/src/types/constants.ts` - Added TABLE_PROPERTY_VALUES (id: 26), TABLE_CONVERSATION_PROPERTIES (id: 27)
- `shared/src/types/entities.ts` - Added PropertyValue, ConversationProperty interfaces; updated NodeProperty with is_reference and reference_value
- `shared/src/schema/tables.ts` - Added propertyValuesTable, conversationPropertiesTable; updated nodePropertiesTable and allTables array

### Phase 2: CRUD Layer ✅ COMPLETE
1. ✅ Create `crud-property-values.ts`
2. ✅ Create `crud-conversation-properties.ts`
3. ✅ Update `crud-node-properties.ts` for new fields (is_reference, reference_value)
4. ✅ Update `crud-property-templates.ts` to cascade delete property_values and conversation_properties
5. ✅ Export new modules from `crud/index.ts`

**Files created:**
- `ui/src/lib/crud/crud-property-values.ts`
- `ui/src/lib/crud/crud-conversation-properties.ts`

**Files modified:**
- `ui/src/lib/crud/crud-node-properties.ts` - Added is_reference and reference_value to CreateNodePropertyParams
- `ui/src/lib/crud/crud-property-templates.ts` - Updated remove() to delete conversation_properties and property_values
- `ui/src/lib/crud/index.ts` - Added exports for propertyValues and conversationProperties

### Phase 3: Table Views ✅ COMPLETE
1. ✅ Create `property-values.ts` table view
2. ✅ Export from `tables/index.ts`

**Files created:**
- `ui/src/lib/tables/property-values.ts`

**Files modified:**
- `ui/src/lib/tables/index.ts` - Added propertyValuesTable export

### Phase 4: UI - Property Values Management ✅ COMPLETE
1. ✅ Create `PropertyCombobox.svelte` component (combobox for selecting predefined/custom values)
2. ✅ Create `PropertyValuesList.svelte` component (managing predefined values for a template)
3. ✅ Create `PropertySettingsPanel.svelte` component (unified panel for templates + values)

**Files created:**
- `ui/src/lib/components/common/PropertyValuesList.svelte`
- `ui/src/lib/components/common/PropertyCombobox.svelte`
- `ui/src/lib/components/common/PropertySettingsPanel.svelte`

**Files modified:**
- `ui/src/lib/components/common/index.ts` - Added exports

**UI Note:** The "is_reference" field should be displayed to users as "Custom Value" checkbox. When checked = custom value (is_reference=false), when unchecked = using predefined value (is_reference=true).

### Phase 5: UI - Update Existing Components ✅ COMPLETE
1. ✅ Update `RowColumnProperties.svelte` for reference support (use PropertyCombobox)
2. ✅ Create `RowColumnConversationProperties.svelte`
3. ✅ Update `InspectorConversation.svelte` to show properties

**Files created:**
- `ui/src/lib/components/common/RowColumnConversationProperties.svelte`

**Files modified:**
- `ui/src/lib/components/common/RowColumnProperties.svelte` - Now uses PropertyCombobox, supports is_reference/reference_value
- `ui/src/lib/components/inspector/InspectorConversation.svelte` - Added custom properties section

### Phase 6: UI - Settings Panel ✅ COMPLETE (Updated)
1. ✅ Update `Graph.svelte` to use expandable panel instead of modal
2. ✅ Integrate `PropertySettingsPanel.svelte` into Graph.svelte
3. ✅ Remove `GraphSettingsModal.svelte`
4. ✅ Restore "Layout Defaults" settings to Graph.svelte settings panel
5. ✅ Create `InspectorPropertyTemplate.svelte` for inspecting property templates in the Inspector
6. ✅ Add focus store functions for property templates (`focusPropertyTemplate`, `focusedPropertyTemplate`)
7. ✅ Update `PropertySettingsPanel.svelte` to follow `TagCategorySettingsPanel` pattern (click to inspect in Inspector)
8. ✅ Add conversation property templates to ConversationFinder settings panel

**Files modified:**
- `ui/src/lib/components/graph/Graph.svelte` - Replaced modal with inline settings panel containing Layout Defaults and PropertySettingsPanel
- `ui/src/lib/components/common/PropertySettingsPanel.svelte` - Now follows TagCategorySettingsPanel pattern (focusTemplate callback)
- `ui/src/lib/components/inspector/Inspector.svelte` - Handles TABLE_PROPERTY_TEMPLATES focus
- `ui/src/lib/components/panels/ConversationFinder.svelte` - Added PropertySettingsPanel for conversation properties
- `ui/src/lib/stores/focus.ts` - Added focusPropertyTemplate, focusedPropertyTemplate, focusedPropertyTemplates
- `ui/src/lib/components/common/EditableList.svelte` - Added getDisplayName prop for items without 'name' property
- `ui/src/lib/components/common/EditableListItem.svelte` - Added getDisplayName prop

**Files created:**
- `ui/src/lib/components/inspector/InspectorPropertyTemplate.svelte` - Inspector for property templates with predefined values list
- `ui/src/lib/components/common/PropertyCombobox.types.ts` - Type definitions for PropertyCombobox

**Files deleted:**
- `ui/src/lib/components/graph/GraphSettingsModal.svelte`
- `ui/src/lib/components/common/PropertyValuesList.svelte` (no longer needed - values managed in InspectorPropertyTemplate)

**UI Pattern:** Property templates follow the same pattern as tag categories:
- Settings panel shows list of templates with add/rename/delete/type-change
- Clicking a template focuses it in the Inspector
- Inspector shows template details and list of predefined values

### Phase 7: Migration ✅ COMPLETE
1. ✅ Create external migration SQL script (one-time run for existing databases)

**Files created:**
- `tools/migrate-properties-v2.sql` - SQL script to migrate existing databases

**Usage:**
```bash
# SQLite
sqlite3 your_database.db < tools/migrate-properties-v2.sql

# PostgreSQL
psql -d your_database -f tools/migrate-properties-v2.sql
```

**Note:** New databases created after this update will have these tables/columns automatically via the schema definitions in `shared/src/schema/tables.ts`.

### Phase 8: Runtime/Export Layer ✅ COMPLETE
1. ✅ Update `snapshot.fbs` schema with `ConversationProperty` table
2. ✅ Update export `types.ts` with `ExportConversationProperty` and `ExportPropertyValue`
3. ✅ Update `snapshot-data-fetcher.ts` to fetch conversation properties and resolve `is_reference`/`reference_value`
4. ✅ Update `snapshot-serializer.ts` to serialize conversation properties
5. ✅ Update Unity `Refs.cs` with `ConversationPropertyRef` and `ConversationRef.GetProperty()`
6. ✅ Regenerate FlatBuffers TypeScript bindings
7. ✅ Regenerate FlatSharp C# bindings (Unity)

**Files modified:**
- `core/schema/snapshot.fbs` - Added `ConversationProperty` table, added `properties` field to `Conversation`
- `ui/src/lib/export/types.ts` - Added `ExportConversationProperty`, `ExportPropertyValue`
- `ui/src/lib/export/snapshot-data-fetcher.ts` - Fetches conversation properties, property values; resolves references
- `ui/src/lib/export/snapshot-serializer.ts` - Added `buildConversationProperty()` function
- `ui/src/lib/crud/crud-export.ts` - Added `getConversationPropertiesFromNonDeletedConversations()`, `getAllPropertyValues()`
- `runtimes/unity/.../Refs.cs` - Added `ConversationPropertyRef`, updated `ConversationRef` with `PropertyCount`/`GetProperty()`

**Files regenerated:**
- `core/generated/ts/src/game-script/*.ts` - FlatBuffers TypeScript bindings (via `flatc --ts`)
- Unity FlatSharp bindings (via `build:unity` script)

**Runtime behavior:**
- When exporting snapshots, `is_reference` properties are resolved to their actual values
- The runtime doesn't need to know about predefined values - it just sees the resolved value
- This keeps the runtime simple and the snapshot format unchanged for consumers

---

## Testing Checklist

- [ ] Create property template (node)
- [ ] Create property template (conversation)
- [ ] Add predefined value to template
- [ ] Rename predefined value → verify all references update
- [ ] Delete predefined value → verify "broken reference" UI
- [ ] Add property to node using predefined value
- [ ] Add property to node using custom value
- [ ] Switch property from predefined to custom
- [ ] Switch property from custom to predefined
- [ ] Add property to conversation
- [ ] Delete property template → verify cascade delete of values and properties
- [ ] Undo/redo for all operations
- [ ] Settings panel expand/collapse
- [ ] Multi-user sync (PostgreSQL) - predefined value changes propagate

---

## Open Questions

1. **Should we support multiple types per template?** Currently each template has one type. Could a template support both string and integer values?
   - **Recommendation**: No, keep it simple. One type per template.

2. **Should predefined values be sortable?** Users might want to control the order in dropdowns.
   - **Recommendation**: Add `sort_order` column to `property_values` if needed later.

3. **Should we allow bulk import of predefined values?** E.g., paste a list of mood values.
   - **Recommendation**: Nice to have, but not in initial implementation.

4. **How to handle type changes on templates with existing values?**
   - **Recommendation**: Clear all predefined values when type changes (with confirmation).
