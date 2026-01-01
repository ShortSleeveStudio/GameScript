import { describe, it, expect } from 'vitest';
import { query, all, QueryBuilder } from '../query/builder.js';
import type { Row } from '../types/entities.js';

interface TestRow extends Row {
  id: number;
  name: string;
  age: number;
  is_active: boolean;
}

describe('Query Builder', () => {
  describe('query()', () => {
    it('should create an empty query builder', () => {
      const builder = query<TestRow>();
      expect(builder).toBeInstanceOf(QueryBuilder);
    });
  });

  describe('all()', () => {
    it('should create a filter that matches all rows', () => {
      const filter = all<TestRow>();
      const row: TestRow = { id: 1, name: 'Test', age: 25, is_active: true };

      expect(filter.matches(row)).toBe(true);
      expect(filter.toWhereClause('sqlite')).toBe('');
    });
  });

  describe('where conditions', () => {
    it('should build eq condition', () => {
      const filter = query<TestRow>().where('name').eq('Alice').build();

      expect(filter.toSqlSuffix('sqlite')).toBe('WHERE "name" = ?');
      expect(filter.getParameters()).toEqual(['Alice']);
    });

    it('should build ne condition', () => {
      const filter = query<TestRow>().where('age').ne(30).build();

      expect(filter.toSqlSuffix('sqlite')).toBe('WHERE "age" != ?');
      expect(filter.toSqlSuffix('postgres')).toBe('WHERE age <> $1');
    });

    it('should build lt/lte/gt/gte conditions', () => {
      expect(query<TestRow>().where('age').lt(30).build().toSqlSuffix('sqlite'))
        .toBe('WHERE "age" < ?');
      expect(query<TestRow>().where('age').lte(30).build().toSqlSuffix('sqlite'))
        .toBe('WHERE "age" <= ?');
      expect(query<TestRow>().where('age').gt(30).build().toSqlSuffix('sqlite'))
        .toBe('WHERE "age" > ?');
      expect(query<TestRow>().where('age').gte(30).build().toSqlSuffix('sqlite'))
        .toBe('WHERE "age" >= ?');
    });

    it('should build like condition', () => {
      const filter = query<TestRow>().where('name').like('%Alice%').build();

      expect(filter.toSqlSuffix('sqlite')).toBe('WHERE "name" LIKE ?');
      expect(filter.getParameters()).toEqual(['%Alice%']);
    });

    it('should build in condition', () => {
      const filter = query<TestRow>().where('age').in([25, 30, 35]).build();

      expect(filter.toSqlSuffix('sqlite')).toBe('WHERE "age" IN (?, ?, ?)');
      expect(filter.getParameters()).toEqual([25, 30, 35]);
    });

    it('should build isNull condition', () => {
      const filter = query<TestRow>().where('name').isNull().build();

      expect(filter.toSqlSuffix('sqlite')).toBe('WHERE "name" IS NULL');
      expect(filter.getParameters()).toEqual([]);
    });
  });

  describe('compound conditions', () => {
    it('should build AND conditions', () => {
      const filter = query<TestRow>()
        .where('name').eq('Alice')
        .and('age').gte(18)
        .build();

      expect(filter.toSqlSuffix('sqlite')).toBe('WHERE ("name" = ? AND "age" >= ?)');
    });

    it('should build OR conditions', () => {
      const filter = query<TestRow>()
        .where('name').eq('Alice')
        .or('name').eq('Bob')
        .build();

      expect(filter.toSqlSuffix('sqlite')).toBe('WHERE ("name" = ? OR "name" = ?)');
    });
  });

  describe('orderBy', () => {
    it('should add ORDER BY clause', () => {
      const filter = query<TestRow>()
        .where('is_active').eq(true)
        .orderBy('name', 'ASC')
        .build();

      expect(filter.toSqlSuffix('sqlite')).toBe('WHERE "is_active" = ? ORDER BY "name" ASC');
    });

    it('should support multiple order columns', () => {
      const filter = query<TestRow>()
        .where('is_active').eq(true)
        .orderBy('name', 'ASC')
        .orderBy('age', 'DESC')
        .build();

      expect(filter.toSqlSuffix('sqlite')).toBe('WHERE "is_active" = ? ORDER BY "name" ASC, "age" DESC');
    });
  });

  describe('limit and offset', () => {
    it('should add LIMIT clause', () => {
      const filter = query<TestRow>()
        .where('is_active').eq(true)
        .limit(10)
        .build();

      expect(filter.toSqlSuffix('sqlite')).toBe('WHERE "is_active" = ? LIMIT 10');
    });

    it('should add OFFSET clause', () => {
      const filter = query<TestRow>()
        .where('is_active').eq(true)
        .limit(10)
        .offset(20)
        .build();

      expect(filter.toSqlSuffix('sqlite')).toBe('WHERE "is_active" = ? LIMIT 10 OFFSET 20');
    });
  });

  describe('matches()', () => {
    it('should match rows with eq condition', () => {
      const filter = query<TestRow>().where('name').eq('Alice').build();

      expect(filter.matches({ id: 1, name: 'Alice', age: 25, is_active: true })).toBe(true);
      expect(filter.matches({ id: 2, name: 'Bob', age: 30, is_active: true })).toBe(false);
    });

    it('should match rows with numeric comparisons', () => {
      const filter = query<TestRow>().where('age').gte(18).build();

      expect(filter.matches({ id: 1, name: 'Alice', age: 25, is_active: true })).toBe(true);
      expect(filter.matches({ id: 2, name: 'Bob', age: 16, is_active: true })).toBe(false);
    });

    it('should match rows with like pattern', () => {
      const filter = query<TestRow>().where('name').like('%ice').build();

      expect(filter.matches({ id: 1, name: 'Alice', age: 25, is_active: true })).toBe(true);
      expect(filter.matches({ id: 2, name: 'Bob', age: 30, is_active: true })).toBe(false);
    });

    it('should match rows with AND conditions', () => {
      const filter = query<TestRow>()
        .where('name').eq('Alice')
        .and('age').gte(18)
        .build();

      expect(filter.matches({ id: 1, name: 'Alice', age: 25, is_active: true })).toBe(true);
      expect(filter.matches({ id: 2, name: 'Alice', age: 16, is_active: true })).toBe(false);
    });

    it('should match rows with OR conditions', () => {
      const filter = query<TestRow>()
        .where('name').eq('Alice')
        .or('name').eq('Bob')
        .build();

      expect(filter.matches({ id: 1, name: 'Alice', age: 25, is_active: true })).toBe(true);
      expect(filter.matches({ id: 2, name: 'Bob', age: 30, is_active: true })).toBe(true);
      expect(filter.matches({ id: 3, name: 'Charlie', age: 35, is_active: true })).toBe(false);
    });
  });
});
