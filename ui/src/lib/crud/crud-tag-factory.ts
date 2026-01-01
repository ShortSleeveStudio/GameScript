/**
 * Generic factory for creating tag category and tag value CRUD operations.
 *
 * This eliminates duplication between conversation/localization tag CRUD files.
 * Each entity type (conversations, localizations) has its own tag categories
 * and tag values, but the CRUD logic is identical - only the types and tables differ.
 */

import { db } from '$lib/db';
import { registerUndoable, Undoable } from '$lib/undo';
import {
  query,
  tagCategoryIdToColumn,
  type Row,
  type TableRef,
  type BaseTagCategory,
  type BaseTagValue,
} from '@gamescript/shared';

// Re-export base types for consumers
export type { BaseTagCategory, BaseTagValue };

/** Configuration for tag category CRUD operations */
export interface TagCategoryConfig {
  /** Table for tag categories */
  categoryTable: TableRef;
  /** Table for tag values */
  valueTable: TableRef;
  /** Table for entities that have tag assignments (e.g., conversations, localizations) */
  entityTable: TableRef;
}

/** Configuration for tag value CRUD operations */
export interface TagValueConfig {
  /** Table for tag values */
  valueTable: TableRef;
  /** Table for entities that have tag assignments */
  entityTable: TableRef;
}

// ============================================================================
// Tag Category Factory
// ============================================================================

export interface TagCategoryCrud<TCategory extends BaseTagCategory> {
  getAll(): Promise<TCategory[]>;
  getById(id: number): Promise<TCategory | null>;
  create(name: string): Promise<TCategory>;
  updateMany(oldCategories: TCategory[], newCategories: TCategory[]): Promise<TCategory[]>;
  updateOne(oldCategory: TCategory, newCategory: TCategory): Promise<TCategory>;
  remove(categoryId: number): Promise<void>;
}

/**
 * Create CRUD operations for a tag category type.
 */
export function createTagCategoryCrud<TCategory extends BaseTagCategory>(
  config: TagCategoryConfig
): TagCategoryCrud<TCategory> {
  const { categoryTable, valueTable, entityTable } = config;

  // Helper to delete a category and its column (used by create undo and remove)
  async function deleteCategory(categoryId: number): Promise<void> {
    await db.transaction(async (tx) => {
      // 1. Delete all values for this category
      const values = await db.select<BaseTagValue>(
        valueTable,
        query<BaseTagValue>().where('category_id').eq(categoryId).build(),
        tx
      );
      if (values.length > 0) {
        await db.delete(
          valueTable,
          values.map((v) => v.id),
          tx
        );
      }

      // 2. Drop column from entity table (clears all entity assignments)
      const columnName = tagCategoryIdToColumn(categoryId);
      await db.dropColumn(entityTable, columnName, tx);

      // 3. Delete the category
      await db.delete(categoryTable, categoryId, tx);
    });
  }

  // Helper to restore a category and its column (used by create redo)
  async function restoreCategory(category: TCategory): Promise<void> {
    await db.transaction(async (tx) => {
      await db.insertWithId<TCategory>(categoryTable, category, tx);
      const columnName = tagCategoryIdToColumn(category.id);
      await db.addColumn(entityTable, columnName, 'INTEGER', tx);
    });
  }

  return {
    async getAll(): Promise<TCategory[]> {
      return db.select<TCategory>(categoryTable, query<TCategory>().build());
    },

    async getById(id: number): Promise<TCategory | null> {
      return db.selectById<TCategory>(categoryTable, id);
    },

    async create(name: string): Promise<TCategory> {
      let category: TCategory | undefined;

      await db.transaction(async (tx) => {
        // 1. Create the category
        category = await db.insert<TCategory>(
          categoryTable,
          { name } as unknown as Omit<TCategory, 'id'>,
          tx
        );

        // 2. Add tag column to entity table
        const columnName = tagCategoryIdToColumn(category.id);
        await db.addColumn(entityTable, columnName, 'INTEGER', tx);
      });

      if (!category) throw new Error('Failed to create tag category');

      const capturedCategory = { ...category };

      // Undoable: newly created category has no entity assignments yet
      registerUndoable(
        new Undoable(
          `Create tag category "${name}"`,
          async () => {
            await deleteCategory(capturedCategory.id);
          },
          async () => {
            await restoreCategory(capturedCategory);
          }
        )
      );

      return category;
    },

    async updateMany(
      oldCategories: TCategory[],
      newCategories: TCategory[]
    ): Promise<TCategory[]> {
      const results = await db.updateRows<TCategory>(categoryTable, newCategories);

      registerUndoable(
        new Undoable(
          oldCategories.length > 1 ? 'Update tag categories' : 'Update tag category',
          async () => {
            await db.updateRows(categoryTable, oldCategories);
          },
          async () => {
            await db.updateRows(categoryTable, newCategories);
          }
        )
      );

      return results;
    },

    async updateOne(
      oldCategory: TCategory,
      newCategory: TCategory
    ): Promise<TCategory> {
      const results = await this.updateMany([oldCategory], [newCategory]);
      return results[0];
    },

    async remove(categoryId: number): Promise<void> {
      await deleteCategory(categoryId);
      // Not undoable: deletes category, all values, and entity assignments. User confirms via modal.
    },
  };
}

// ============================================================================
// Tag Value Factory
// ============================================================================

export interface TagValueCrud<TValue extends BaseTagValue> {
  getAll(): Promise<TValue[]>;
  getById(id: number): Promise<TValue | null>;
  getByCategory(categoryId: number): Promise<TValue[]>;
  create(categoryId: number, name: string): Promise<TValue>;
  updateMany(oldValues: TValue[], newValues: TValue[]): Promise<TValue[]>;
  updateOne(oldValue: TValue, newValue: TValue): Promise<TValue>;
  remove(valueId: number): Promise<void>;
}

/**
 * Create CRUD operations for a tag value type.
 */
export function createTagValueCrud<TValue extends BaseTagValue, TEntity extends Row>(
  config: TagValueConfig
): TagValueCrud<TValue> {
  const { valueTable, entityTable } = config;

  // Helper to delete a value and clear its entity assignments
  async function deleteValue(valueId: number): Promise<void> {
    const value = await db.selectById<TValue>(valueTable, valueId);
    if (!value) return; // Already deleted

    // Clear FK references on entities before deleting the value
    const columnName = tagCategoryIdToColumn(value.category_id);
    await db.clearColumnWhere<TEntity>(
      entityTable,
      columnName,
      query<TEntity>().where(columnName as keyof TEntity).eq(valueId).build()
    );

    await db.delete(valueTable, valueId);
  }

  return {
    async getAll(): Promise<TValue[]> {
      return db.select<TValue>(valueTable, query<TValue>().build());
    },

    async getById(id: number): Promise<TValue | null> {
      return db.selectById<TValue>(valueTable, id);
    },

    async getByCategory(categoryId: number): Promise<TValue[]> {
      return db.select<TValue>(
        valueTable,
        query<TValue>().where('category_id' as keyof TValue).eq(categoryId).build()
      );
    },

    async create(categoryId: number, name: string): Promise<TValue> {
      const value = await db.insert<TValue>(valueTable, {
        category_id: categoryId,
        name,
      } as unknown as Omit<TValue, 'id'>);

      const capturedValue = { ...value };

      registerUndoable(
        new Undoable(
          `Create tag value "${name}"`,
          async () => {
            // Must clear entity assignments in case user assigned the value before undoing
            await deleteValue(capturedValue.id);
          },
          async () => {
            await db.insertWithId<TValue>(valueTable, capturedValue);
          }
        )
      );

      return value;
    },

    async updateMany(
      oldValues: TValue[],
      newValues: TValue[]
    ): Promise<TValue[]> {
      const results = await db.updateRows<TValue>(valueTable, newValues);

      registerUndoable(
        new Undoable(
          oldValues.length > 1 ? 'Update tag values' : 'Update tag value',
          async () => {
            await db.updateRows(valueTable, oldValues);
          },
          async () => {
            await db.updateRows(valueTable, newValues);
          }
        )
      );

      return results;
    },

    async updateOne(
      oldValue: TValue,
      newValue: TValue
    ): Promise<TValue> {
      const results = await this.updateMany([oldValue], [newValue]);
      return results[0];
    },

    async remove(valueId: number): Promise<void> {
      await deleteValue(valueId);
      // Not undoable: deletes value and entity assignments. User confirms via modal.
    },
  };
}
