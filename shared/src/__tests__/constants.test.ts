import { describe, it, expect } from 'vitest';
import {
  FIELD_TYPES,
  FIELD_TYPE_INTEGER,
  FIELD_TYPE_TEXT,
  DATABASE_TABLES,
  TABLE_NODES,
  TABLE_CONVERSATIONS,
  TABLE_LOCALES,
  TABLE_ACTORS,
  NODE_TYPES,
  NODE_TYPE_ROOT,
  NODE_TYPE_DIALOGUE,
  EDGE_TYPES,
  PROPERTY_TYPES,
  localeIdToColumn,
  localeColumnToId,
  isLocaleColumn,
} from '../types/constants.js';

describe('Constants', () => {
  describe('FIELD_TYPES', () => {
    it('should have 5 field types', () => {
      expect(FIELD_TYPES).toHaveLength(5);
    });

    it('should include INTEGER and TEXT types', () => {
      expect(FIELD_TYPES).toContain(FIELD_TYPE_INTEGER);
      expect(FIELD_TYPES).toContain(FIELD_TYPE_TEXT);
    });

    it('should have unique IDs', () => {
      const ids = FIELD_TYPES.map((t) => t.id);
      const uniqueIds = new Set(ids);
      expect(uniqueIds.size).toBe(FIELD_TYPES.length);
    });
  });

  describe('DATABASE_TABLES', () => {
    it('should have 14 tables', () => {
      expect(DATABASE_TABLES).toHaveLength(14);
    });

    it('should include core tables', () => {
      expect(DATABASE_TABLES).toContain(TABLE_NODES);
      expect(DATABASE_TABLES).toContain(TABLE_CONVERSATIONS);
      expect(DATABASE_TABLES).toContain(TABLE_LOCALES);
      expect(DATABASE_TABLES).toContain(TABLE_ACTORS);
    });

    it('should have unique IDs', () => {
      const ids = DATABASE_TABLES.map((t) => t.id);
      const uniqueIds = new Set(ids);
      expect(uniqueIds.size).toBe(DATABASE_TABLES.length);
    });

    it('should have unique names', () => {
      const names = DATABASE_TABLES.map((t) => t.name);
      const uniqueNames = new Set(names);
      expect(uniqueNames.size).toBe(DATABASE_TABLES.length);
    });
  });

  describe('NODE_TYPES', () => {
    it('should have 2 node types', () => {
      expect(NODE_TYPES).toHaveLength(2);
    });

    it('should include root and dialogue types', () => {
      expect(NODE_TYPES).toContain(NODE_TYPE_ROOT);
      expect(NODE_TYPES).toContain(NODE_TYPE_DIALOGUE);
    });
  });

  describe('EDGE_TYPES', () => {
    it('should have 2 edge types', () => {
      expect(EDGE_TYPES).toHaveLength(2);
    });
  });

  describe('PROPERTY_TYPES', () => {
    it('should have 5 property types', () => {
      expect(PROPERTY_TYPES).toHaveLength(5);
    });
  });
});

describe('Locale helpers', () => {
  describe('localeIdToColumn', () => {
    it('should convert locale ID to column name', () => {
      expect(localeIdToColumn(1)).toBe('locale_1');
      expect(localeIdToColumn(42)).toBe('locale_42');
    });
  });

  describe('localeColumnToId', () => {
    it('should extract locale ID from column name', () => {
      expect(localeColumnToId('locale_1')).toBe(1);
      expect(localeColumnToId('locale_42')).toBe(42);
    });

    it('should return null for non-locale columns', () => {
      expect(localeColumnToId('id')).toBeNull();
      expect(localeColumnToId('name')).toBeNull();
      expect(localeColumnToId('locale_')).toBeNull();
    });
  });

  describe('isLocaleColumn', () => {
    it('should identify locale columns', () => {
      expect(isLocaleColumn('locale_1')).toBe(true);
      expect(isLocaleColumn('locale_42')).toBe(true);
    });

    it('should reject non-locale columns', () => {
      expect(isLocaleColumn('id')).toBe(false);
      expect(isLocaleColumn('name')).toBe(false);
      expect(isLocaleColumn('locale_')).toBe(false);
      expect(isLocaleColumn('locale_abc')).toBe(false);
    });
  });
});
