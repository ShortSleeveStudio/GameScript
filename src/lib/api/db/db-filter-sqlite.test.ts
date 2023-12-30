import { createFilter } from '@lib/api/db/db-filter';
import { NODE_TYPE_ID_ACTOR, type FieldRow, type NodeRow } from '@lib/api/db/db-schema';
import { expect, test } from 'vitest';

test('is', () => {
    const result = createFilter<NodeRow>().where('type').is(NODE_TYPE_ID_ACTOR).build();
    expect(result.toString()).toBe('type IS 0');
    expect(result.wouldAffectRow(<NodeRow>{ type: NODE_TYPE_ID_ACTOR })).toBe(true);
    expect(result.wouldAffectRow(<NodeRow>{ type: -1 })).toBe(false);
});

test('is not', () => {
    const result = createFilter<NodeRow>().where('type').isNot(NODE_TYPE_ID_ACTOR).build();
    expect(result.toString()).toBe('type IS NOT 0');
    expect(result.wouldAffectRow(<NodeRow>{ type: NODE_TYPE_ID_ACTOR })).toBe(false);
    expect(result.wouldAffectRow(<NodeRow>{ type: -1 })).toBe(true);
});

test('like', () => {
    const result = createFilter<FieldRow>().where('name').like('%Eric_Fulton%').build();
    expect(result.toString()).toBe("name LIKE '%Eric_Fulton%'");
    expect(result.wouldAffectRow(<FieldRow>{ name: 'asdfasdfaEric&Fultona2342' })).toBe(true);
    expect(result.wouldAffectRow(<FieldRow>{ name: 'asdErc&Fultona2342' })).toBe(false);
});

test('not like', () => {
    const result = createFilter<FieldRow>().where('name').notLike('%Eric_Fulton%').build();
    expect(result.toString()).toBe("name NOT LIKE '%Eric_Fulton%'");
    expect(result.wouldAffectRow(<FieldRow>{ name: 'asdfasdfaEric&Fultona2342' })).toBe(false);
    expect(result.wouldAffectRow(<FieldRow>{ name: 'asdErc&Fultona2342' })).toBe(true);
});

test('gt', () => {
    const result = createFilter<NodeRow>().where('id').gt(100).build();
    expect(result.toString()).toBe('id > 100');
    expect(result.wouldAffectRow(<NodeRow>{ id: 101 })).toBe(true);
    expect(result.wouldAffectRow(<NodeRow>{ id: 100 })).toBe(false);
});

test('gte', () => {
    const result = createFilter<NodeRow>().where('id').gte(100).build();
    expect(result.toString()).toBe('id >= 100');
    expect(result.wouldAffectRow(<NodeRow>{ id: 99 })).toBe(false);
    expect(result.wouldAffectRow(<NodeRow>{ id: 101 })).toBe(true);
    expect(result.wouldAffectRow(<NodeRow>{ id: 100 })).toBe(true);
});

test('lt', () => {
    const result = createFilter<NodeRow>().where('id').lt(100).build();
    expect(result.toString()).toBe('id < 100');
    expect(result.wouldAffectRow(<NodeRow>{ id: 99 })).toBe(true);
    expect(result.wouldAffectRow(<NodeRow>{ id: 100 })).toBe(false);
});

test('lte', () => {
    const result = createFilter<NodeRow>().where('id').lte(100).build();
    expect(result.toString()).toBe('id <= 100');
    expect(result.wouldAffectRow(<NodeRow>{ id: 99 })).toBe(true);
    expect(result.wouldAffectRow(<NodeRow>{ id: 100 })).toBe(true);
    expect(result.wouldAffectRow(<NodeRow>{ id: 101 })).toBe(false);
});

test('in', () => {
    const result = createFilter<NodeRow>().where('id').in([44, 100, 99]).build();
    expect(result.toString()).toBe('id IN (44, 100, 99)');
    expect(result.wouldAffectRow(<NodeRow>{ id: 99 })).toBe(true);
    expect(result.wouldAffectRow(<NodeRow>{ id: 100 })).toBe(true);
    expect(result.wouldAffectRow(<NodeRow>{ id: 44 })).toBe(true);
    expect(result.wouldAffectRow(<NodeRow>{ id: 1 })).toBe(false);
});

test('not in', () => {
    const result = createFilter<NodeRow>().where('id').notIn([44, 100, 99]).build();
    expect(result.toString()).toBe('id NOT IN (44, 100, 99)');
    expect(result.wouldAffectRow(<NodeRow>{ id: 99 })).toBe(false);
    expect(result.wouldAffectRow(<NodeRow>{ id: 100 })).toBe(false);
    expect(result.wouldAffectRow(<NodeRow>{ id: 44 })).toBe(false);
    expect(result.wouldAffectRow(<NodeRow>{ id: 1 })).toBe(true);
});

test('multiple conditions', () => {
    const result = createFilter<NodeRow>()
        .where('id')
        .in([44, 100, 99, 0])
        .and()
        .where('id')
        .gt(0)
        .and()
        .where('type')
        .is(0)
        .build();
    expect(result.toString()).toBe('id IN (44, 100, 99, 0) AND id > 0 AND type IS 0');
    expect(result.wouldAffectRow(<NodeRow>{ id: 99, type: 0 })).toBe(true);
    expect(result.wouldAffectRow(<NodeRow>{ id: 0, type: 0 })).toBe(false);
    expect(result.wouldAffectRow(<NodeRow>{ id: 2, type: 0 })).toBe(false);
    expect(result.wouldAffectRow(<NodeRow>{ id: 99, type: 1 })).toBe(false);
});

test('scope', () => {
    const result = createFilter<NodeRow>()
        .where('id')
        .in([44, 100, 101, 99, 0])
        .and()
        .openScope()
        .openScope()
        .where('id')
        .gte(100)
        .and()
        .where('id')
        .lte(102)
        .closeScope()
        .or()
        .openScope()
        .where('id')
        .is(40)
        .or()
        .where('id')
        .is(99)
        .closeScope()
        .closeScope()
        .and()
        .where('type')
        .is(0)
        .build();
    expect(result.toString()).toBe(
        'id IN (44, 100, 101, 99, 0) AND ( ( id >= 100 AND id <= 102 ) OR ( id IS 40 OR id IS 99 ) ) AND type IS 0',
    );
    expect(result.wouldAffectRow(<NodeRow>{ id: 99, type: 0 })).toBe(true);
    expect(result.wouldAffectRow(<NodeRow>{ id: 100, type: 0 })).toBe(true);
    expect(result.wouldAffectRow(<NodeRow>{ id: 101, type: 0 })).toBe(true);
    expect(result.wouldAffectRow(<NodeRow>{ id: 39, type: 1 })).toBe(false);
});
