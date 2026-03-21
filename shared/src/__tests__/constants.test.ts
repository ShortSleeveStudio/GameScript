import { describe, it, expect, beforeEach } from 'vitest';
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
  NODE_TYPE_LOGIC,
  EDGE_TYPES,
  PROPERTY_TYPES,
  PLURAL_CATEGORIES,
  GENDER_CATEGORIES,
  ACTOR_GENDERS,
  FORM_COLUMNS_PER_LOCALE,
  localeIdToColumns,
  clearLocaleColumnsCache,
  parseLocaleFormColumn,
  isLocaleFormColumn,
  type PluralCategory,
  type GenderCategory,
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
    it('should have 28 tables', () => {
      expect(DATABASE_TABLES).toHaveLength(28);
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
    it('should have 3 node types', () => {
      expect(NODE_TYPES).toHaveLength(3);
    });

    it('should include root, dialogue, and logic types', () => {
      expect(NODE_TYPES).toContain(NODE_TYPE_ROOT);
      expect(NODE_TYPES).toContain(NODE_TYPE_DIALOGUE);
      expect(NODE_TYPES).toContain(NODE_TYPE_LOGIC);
    });
  });

  describe('EDGE_TYPES', () => {
    it('should have 2 edge types', () => {
      expect(EDGE_TYPES).toHaveLength(2);
    });
  });

  describe('PROPERTY_TYPES', () => {
    it('should have 4 property types', () => {
      expect(PROPERTY_TYPES).toHaveLength(4);
    });
  });
});

describe('Plural and gender categories', () => {
  it('should have 6 plural categories', () => {
    expect(PLURAL_CATEGORIES).toHaveLength(6);
    expect(PLURAL_CATEGORIES).toEqual(['zero', 'one', 'two', 'few', 'many', 'other']);
  });

  it('should have 4 gender categories', () => {
    expect(GENDER_CATEGORIES).toHaveLength(4);
    expect(GENDER_CATEGORIES).toEqual(['other', 'masculine', 'feminine', 'neuter']);
  });

  it('should have 5 actor genders (gender categories + dynamic)', () => {
    expect(ACTOR_GENDERS).toHaveLength(5);
    expect(ACTOR_GENDERS).toEqual(['other', 'masculine', 'feminine', 'neuter', 'dynamic']);
  });

  it('should compute 24 form columns per locale', () => {
    expect(FORM_COLUMNS_PER_LOCALE).toBe(24);
  });
});

describe('localeIdToColumns', () => {
  beforeEach(() => {
    clearLocaleColumnsCache();
  });

  it('should return an object with all 24 column names', () => {
    const cols = localeIdToColumns(1);
    expect(cols.all).toHaveLength(24);
  });

  it('should return the correct default column', () => {
    const cols = localeIdToColumns(1);
    expect(cols.default).toBe('locale_1_form_other_other');
  });

  it('should return correct form columns', () => {
    const cols = localeIdToColumns(1);
    expect(cols.form('other', 'other')).toBe('locale_1_form_other_other');
    expect(cols.form('one', 'masculine')).toBe('locale_1_form_one_masculine');
    expect(cols.form('zero', 'feminine')).toBe('locale_1_form_zero_feminine');
    expect(cols.form('few', 'neuter')).toBe('locale_1_form_few_neuter');
    expect(cols.form('many', 'other')).toBe('locale_1_form_many_other');
    expect(cols.form('two', 'masculine')).toBe('locale_1_form_two_masculine');
  });

  it('should work with different locale IDs', () => {
    const cols42 = localeIdToColumns(42);
    expect(cols42.default).toBe('locale_42_form_other_other');
    expect(cols42.form('one', 'feminine')).toBe('locale_42_form_one_feminine');
    expect(cols42.all).toHaveLength(24);
  });

  it('should include default column in the all array', () => {
    const cols = localeIdToColumns(1);
    expect(cols.all).toContain(cols.default);
  });

  it('should include all plural × gender combinations in the all array', () => {
    const cols = localeIdToColumns(1);
    for (const plural of PLURAL_CATEGORIES) {
      for (const gender of GENDER_CATEGORIES) {
        expect(cols.all).toContain(cols.form(plural, gender));
      }
    }
  });

  it('should return the same cached object for the same locale ID', () => {
    const a = localeIdToColumns(1);
    const b = localeIdToColumns(1);
    expect(a).toBe(b); // Same reference, not just deep equal
  });

  it('should return different objects for different locale IDs', () => {
    const a = localeIdToColumns(1);
    const b = localeIdToColumns(2);
    expect(a).not.toBe(b);
    expect(a.default).not.toBe(b.default);
  });

  it('should have a frozen all array', () => {
    const cols = localeIdToColumns(1);
    expect(Object.isFrozen(cols.all)).toBe(true);
  });
});

describe('parseLocaleFormColumn', () => {
  it('should parse valid locale form columns', () => {
    expect(parseLocaleFormColumn('locale_1_form_other_other')).toEqual({
      localeId: 1,
      plural: 'other',
      gender: 'other',
    });
    expect(parseLocaleFormColumn('locale_42_form_one_masculine')).toEqual({
      localeId: 42,
      plural: 'one',
      gender: 'masculine',
    });
    expect(parseLocaleFormColumn('locale_3_form_few_neuter')).toEqual({
      localeId: 3,
      plural: 'few',
      gender: 'neuter',
    });
  });

  it('should return null for invalid column names', () => {
    expect(parseLocaleFormColumn('id')).toBeNull();
    expect(parseLocaleFormColumn('name')).toBeNull();
    expect(parseLocaleFormColumn('locale_1')).toBeNull();
    expect(parseLocaleFormColumn('locale_1_form_other')).toBeNull();
    expect(parseLocaleFormColumn('locale_abc_form_other_other')).toBeNull();
    expect(parseLocaleFormColumn('locale_0_form_other_other')).toBeNull();
    expect(parseLocaleFormColumn('locale_1_form_invalid_other')).toBeNull();
    expect(parseLocaleFormColumn('locale_1_form_other_invalid')).toBeNull();
    expect(parseLocaleFormColumn('')).toBeNull();
    expect(parseLocaleFormColumn('tag_category_1')).toBeNull();
  });

  it('should round-trip with localeIdToColumns', () => {
    const cols = localeIdToColumns(7);
    for (const colName of cols.all) {
      const parsed = parseLocaleFormColumn(colName);
      expect(parsed).not.toBeNull();
      expect(parsed!.localeId).toBe(7);
      // Reconstruct and verify
      const reconstructed = cols.form(parsed!.plural, parsed!.gender);
      expect(reconstructed).toBe(colName);
    }
  });
});

describe('isLocaleFormColumn', () => {
  it('should identify valid locale form columns', () => {
    expect(isLocaleFormColumn('locale_1_form_other_other')).toBe(true);
    expect(isLocaleFormColumn('locale_42_form_one_masculine')).toBe(true);
    expect(isLocaleFormColumn('locale_3_form_zero_feminine')).toBe(true);
  });

  it('should reject invalid column names', () => {
    expect(isLocaleFormColumn('id')).toBe(false);
    expect(isLocaleFormColumn('locale_1')).toBe(false);
    expect(isLocaleFormColumn('locale_abc_form_other_other')).toBe(false);
    expect(isLocaleFormColumn('locale_1_form_invalid_other')).toBe(false);
    expect(isLocaleFormColumn('tag_category_1')).toBe(false);
  });
});
