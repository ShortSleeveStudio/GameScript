import { ROUTINE_TYPE_ID_USER, type Conversation, type Routine } from '@common/common-schema';
import { createFilter } from '@lib/api/db/db-filter';
import { expect, test } from 'vitest';
import { ASC, DESC } from './db-filter-interface';

test('eq', () => {
    const result = createFilter<Routine>()
        .where()
        .column('type')
        .eq(ROUTINE_TYPE_ID_USER)
        .endWhere()
        .build();
    expect(result.toString()).toBe('WHERE type = 0');
    expect(result.wouldAffectRow(<Routine>{ type: ROUTINE_TYPE_ID_USER })).toBe(true);
    expect(result.wouldAffectRow(<Routine>{ type: -1 })).toBe(false);
});

test('eq boolean number', () => {
    const result = createFilter<Conversation>()
        .where()
        .column('isDeleted')
        .eq(1)
        .endWhere()
        .build();
    expect(result.toString()).toBe('WHERE isDeleted = 1');
    expect(result.wouldAffectRow(<Conversation>{ isDeleted: true })).toBe(true);
    expect(result.wouldAffectRow(<Conversation>{ isDeleted: false })).toBe(false);
});

test('ne', () => {
    const result = createFilter<Routine>()
        .where()
        .column('type')
        .ne(ROUTINE_TYPE_ID_USER)
        .endWhere()
        .build();
    expect(result.toString()).toBe('WHERE type != 0');
    expect(result.wouldAffectRow(<Routine>{ type: ROUTINE_TYPE_ID_USER })).toBe(false);
    expect(result.wouldAffectRow(<Routine>{ type: -1 })).toBe(true);
});

test('ne boolean number', () => {
    const result = createFilter<Conversation>()
        .where()
        .column('isDeleted')
        .ne(1)
        .endWhere()
        .build();
    expect(result.toString()).toBe('WHERE isDeleted != 1');
    expect(result.wouldAffectRow(<Conversation>{ isDeleted: true })).toBe(false);
    expect(result.wouldAffectRow(<Conversation>{ isDeleted: false })).toBe(true);
});

test('like', () => {
    const result = createFilter<Routine>()
        .where()
        .column('name')
        .like('%Eric_Fulton%')
        .endWhere()
        .build();
    expect(result.toString()).toBe("WHERE name LIKE '%Eric_Fulton%'");
    expect(result.wouldAffectRow(<Routine>{ name: 'asdfasdfaEric&Fultona2342' })).toBe(true);
    expect(result.wouldAffectRow(<Routine>{ name: 'asdErc&Fultona2342' })).toBe(false);
});

test('not like', () => {
    const result = createFilter<Routine>()
        .where()
        .column('name')
        .notLike('%Eric_Fulton%')
        .endWhere()
        .build();
    expect(result.toString()).toBe("WHERE name NOT LIKE '%Eric_Fulton%'");
    expect(result.wouldAffectRow(<Routine>{ name: 'asdfasdfaEric&Fultona2342' })).toBe(false);
    expect(result.wouldAffectRow(<Routine>{ name: 'asdErc&Fultona2342' })).toBe(true);
});

test('gt', () => {
    const result = createFilter<Routine>().where().column('id').gt(100).endWhere().build();
    expect(result.toString()).toBe('WHERE id > 100');
    expect(result.wouldAffectRow(<Routine>{ id: 101 })).toBe(true);
    expect(result.wouldAffectRow(<Routine>{ id: 100 })).toBe(false);
});

test('gte', () => {
    const result = createFilter<Routine>().where().column('id').gte(100).endWhere().build();
    expect(result.toString()).toBe('WHERE id >= 100');
    expect(result.wouldAffectRow(<Routine>{ id: 99 })).toBe(false);
    expect(result.wouldAffectRow(<Routine>{ id: 101 })).toBe(true);
    expect(result.wouldAffectRow(<Routine>{ id: 100 })).toBe(true);
});

test('lt', () => {
    const result = createFilter<Routine>().where().column('id').lt(100).endWhere().build();
    expect(result.toString()).toBe('WHERE id < 100');
    expect(result.wouldAffectRow(<Routine>{ id: 99 })).toBe(true);
    expect(result.wouldAffectRow(<Routine>{ id: 100 })).toBe(false);
});

test('lte', () => {
    const result = createFilter<Routine>().where().column('id').lte(100).endWhere().build();
    expect(result.toString()).toBe('WHERE id <= 100');
    expect(result.wouldAffectRow(<Routine>{ id: 99 })).toBe(true);
    expect(result.wouldAffectRow(<Routine>{ id: 100 })).toBe(true);
    expect(result.wouldAffectRow(<Routine>{ id: 101 })).toBe(false);
});

test('in', () => {
    const result = createFilter<Routine>()
        .where()
        .column('id')
        .in([44, 100, 99])
        .endWhere()
        .build();
    expect(result.toString()).toBe('WHERE id IN (44, 100, 99)');
    expect(result.wouldAffectRow(<Routine>{ id: 99 })).toBe(true);
    expect(result.wouldAffectRow(<Routine>{ id: 100 })).toBe(true);
    expect(result.wouldAffectRow(<Routine>{ id: 44 })).toBe(true);
    expect(result.wouldAffectRow(<Routine>{ id: 1 })).toBe(false);
});

test('not in', () => {
    const result = createFilter<Routine>()
        .where()
        .column('id')
        .notIn([44, 100, 99])
        .endWhere()
        .build();
    expect(result.toString()).toBe('WHERE id NOT IN (44, 100, 99)');
    expect(result.wouldAffectRow(<Routine>{ id: 99 })).toBe(false);
    expect(result.wouldAffectRow(<Routine>{ id: 100 })).toBe(false);
    expect(result.wouldAffectRow(<Routine>{ id: 44 })).toBe(false);
    expect(result.wouldAffectRow(<Routine>{ id: 1 })).toBe(true);
});

test('multiple conditions', () => {
    const result = createFilter<Routine>()
        .where()
        .column('id')
        .in([44, 100, 99, 0])
        .and()
        .column('id')
        .gt(0)
        .and()
        .column('type')
        .eq(0)
        .endWhere()
        .build();
    expect(result.toString()).toBe('WHERE id IN (44, 100, 99, 0) AND id > 0 AND type = 0');
    expect(result.wouldAffectRow(<Routine>{ id: 99, type: 0 })).toBe(true);
    expect(result.wouldAffectRow(<Routine>{ id: 0, type: 0 })).toBe(false);
    expect(result.wouldAffectRow(<Routine>{ id: 2, type: 0 })).toBe(false);
    expect(result.wouldAffectRow(<Routine>{ id: 99, type: 1 })).toBe(false);
});

test('scope', () => {
    const result = createFilter<Routine>()
        .where()
        .column('id')
        .in([44, 100, 101, 99, 0])
        .and()
        .openScope()
        .openScope()
        .column('id')
        .gte(100)
        .and()
        .column('id')
        .lte(102)
        .closeScope()
        .or()
        .openScope()
        .column('id')
        .eq(40)
        .or()
        .column('id')
        .eq(99)
        .closeScope()
        .closeScope()
        .and()
        .column('type')
        .eq(0)
        .endWhere()
        .build();
    expect(result.toString()).toBe(
        'WHERE id IN (44, 100, 101, 99, 0) AND ( ( id >= 100 AND id <= 102 ) OR ( id = 40 OR id = 99 ) ) AND type = 0',
    );
    expect(result.wouldAffectRow(<Routine>{ id: 99, type: 0 })).toBe(true);
    expect(result.wouldAffectRow(<Routine>{ id: 100, type: 0 })).toBe(true);
    expect(result.wouldAffectRow(<Routine>{ id: 101, type: 0 })).toBe(true);
    expect(result.wouldAffectRow(<Routine>{ id: 39, type: 1 })).toBe(false);
});

test('limit', () => {
    const result = createFilter<Routine>()
        .where()
        .column('type')
        .eq(ROUTINE_TYPE_ID_USER)
        .endWhere()
        .limit(5)
        .limit(10)
        .build();
    expect(result.toString()).toBe('WHERE type = 0 LIMIT 10');
});

test('limit 0', () => {
    const result = createFilter<Routine>()
        .where()
        .column('type')
        .eq(ROUTINE_TYPE_ID_USER)
        .endWhere()
        .limit(0)
        .build();
    expect(result.toString()).toBe('WHERE type = 0 LIMIT 0');
});

test('getLimit', () => {
    const result = createFilter<Routine>()
        .where()
        .column('type')
        .eq(ROUTINE_TYPE_ID_USER)
        .endWhere()
        .limit(5)
        .build();
    expect(result.getLimit()).toBe(5);
});

test('offset', () => {
    const result = createFilter<Routine>()
        .where()
        .column('type')
        .eq(ROUTINE_TYPE_ID_USER)
        .endWhere()
        .offset(5)
        .offset(10)
        .build();
    expect(result.toString()).toBe('WHERE type = 0 OFFSET 10');
});

test('getOffset', () => {
    const result = createFilter<Routine>()
        .where()
        .column('type')
        .eq(ROUTINE_TYPE_ID_USER)
        .endWhere()
        .offset(5)
        .build();
    expect(result.getOffset()).toBe(5);
});

test('offset 0', () => {
    const result = createFilter<Routine>()
        .where()
        .column('type')
        .eq(ROUTINE_TYPE_ID_USER)
        .endWhere()
        .offset(0)
        .build();
    expect(result.toString()).toBe('WHERE type = 0 OFFSET 0');
});

test('limit offset', () => {
    const result = createFilter<Routine>()
        .where()
        .column('type')
        .eq(ROUTINE_TYPE_ID_USER)
        .endWhere()
        .offset(5)
        .offset(10)
        .limit(5)
        .limit(10)
        .build();
    expect(result.toString()).toBe('WHERE type = 0 LIMIT 10 OFFSET 10');
});

test('orderBy ASC', () => {
    const result = createFilter<Routine>()
        .where()
        .column('type')
        .eq(ROUTINE_TYPE_ID_USER)
        .endWhere()
        .orderBy('type', ASC)
        .orderBy('type', DESC)
        .build();
    expect(result.toString()).toBe('WHERE type = 0 ORDER BY type DESC');
});

test('orderBy DESC', () => {
    const result = createFilter<Routine>()
        .where()
        .column('type')
        .eq(ROUTINE_TYPE_ID_USER)
        .endWhere()
        .orderBy('type', DESC)
        .orderBy('type', ASC)
        .build();
    expect(result.toString()).toBe('WHERE type = 0 ORDER BY type ASC');
});

test('mulitple orderBy', () => {
    const result = createFilter<Routine>()
        .where()
        .column('type')
        .eq(ROUTINE_TYPE_ID_USER)
        .endWhere()
        .orderBy('type', DESC)
        .orderBy('ID', ASC)
        .build();
    expect(result.toString()).toBe('WHERE type = 0 ORDER BY type DESC, ID ASC');
});

test('orderBy and limit and offset', () => {
    const result = createFilter<Routine>()
        .where()
        .column('type')
        .eq(ROUTINE_TYPE_ID_USER)
        .endWhere()
        .orderBy('type', DESC)
        .orderBy('ID', ASC)
        .limit(10)
        .offset(10)
        .build();
    expect(result.toString()).toBe('WHERE type = 0 ORDER BY type DESC, ID ASC LIMIT 10 OFFSET 10');
});

test('eq', () => {
    const result = createFilter<Routine>()
        .where()
        .column('type')
        .eq(ROUTINE_TYPE_ID_USER)
        .endWhere()
        .limit(100)
        .offset(0)
        .build();
    expect(result.toString()).toBe('WHERE type = 0 LIMIT 100 OFFSET 0');
    expect(result.whereClause()).toBe('WHERE type = 0');
});
