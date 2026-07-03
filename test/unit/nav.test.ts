import {describe, it, expect} from 'vitest';

import {
  buildNavTree,
  buildSearchIndex,
  searchEntries,
} from '../../src/nav.js';
import type {StacContent, StacNode} from '../../src/types.js';

function node(partial: Partial<StacNode> & Pick<StacNode, 'id' | 'type' | 'routePath'>): StacNode {
  return {
    title: partial.title ?? partial.id,
    depth: 0,
    children: [],
    sourceHref: partial.routePath,
    stac: {id: partial.id, links: []} as StacNode['stac'],
    ...partial,
  } as StacNode;
}

function makeContent(): StacContent {
  const item = node({
    id: 'item-1',
    type: 'Item',
    routePath: '/stac/coll/item-1',
    title: 'Item One',
    stac: {
      id: 'item-1',
      links: [],
      description: 'a sunny scene',
      keywords: ['sun', 'clear'],
      properties: {datetime: '2020-01-01T00:00:00Z'},
    } as StacNode['stac'],
  });
  const coll = node({
    id: 'coll',
    type: 'Collection',
    routePath: '/stac/coll',
    title: 'Collection',
    children: [
      {id: 'item-1', type: 'Item', title: 'Item One', routePath: '/stac/coll/item-1'},
      // Dangling ref (no matching node) must be filtered out.
      {id: 'ghost', type: 'Item', title: 'Ghost', routePath: '/stac/coll/ghost'},
    ],
  });
  const root = node({
    id: 'root',
    type: 'Catalog',
    routePath: '/stac',
    title: 'Root',
    children: [
      {id: 'coll', type: 'Collection', title: 'Collection', routePath: '/stac/coll'},
      // Cycle back to root must be pruned by the `seen` guard.
      {id: 'root', type: 'Catalog', title: 'Root', routePath: '/stac'},
    ],
  });
  return {root, nodes: [root, coll, item]};
}

describe('buildNavTree', () => {
  it('builds a nested tree, pruning cycles and dangling refs', () => {
    const tree = buildNavTree(makeContent());
    expect(tree.routePath).toBe('/stac');
    expect(tree.children).toHaveLength(1);
    const coll = tree.children[0];
    expect(coll.routePath).toBe('/stac/coll');
    expect(coll.children).toHaveLength(1);
    expect(coll.children[0].routePath).toBe('/stac/coll/item-1');
  });
});

describe('buildSearchIndex', () => {
  it('captures id/title/type plus optional description, keywords, datetime', () => {
    const index = buildSearchIndex(makeContent());
    const item = index.find((e) => e.id === 'item-1');
    expect(item).toMatchObject({
      type: 'Item',
      title: 'Item One',
      description: 'a sunny scene',
      keywords: ['sun', 'clear'],
      datetime: '2020-01-01T00:00:00Z',
    });
    const root = index.find((e) => e.id === 'root');
    expect(root?.description).toBeUndefined();
    expect(root?.keywords).toBeUndefined();
    expect(root?.datetime).toBeUndefined();
  });
});

describe('searchEntries', () => {
  const index = buildSearchIndex(makeContent());

  it('returns all entries for an empty query', () => {
    expect(searchEntries(index, '   ')).toHaveLength(index.length);
  });

  it('matches on title, description, keywords and type (case-insensitive)', () => {
    expect(searchEntries(index, 'item one').map((e) => e.id)).toContain('item-1');
    expect(searchEntries(index, 'sunny').map((e) => e.id)).toContain('item-1');
    expect(searchEntries(index, 'clear').map((e) => e.id)).toContain('item-1');
    expect(searchEntries(index, 'collection').map((e) => e.id)).toContain('coll');
  });

  it('returns nothing for a non-match', () => {
    expect(searchEntries(index, 'zzzznope')).toHaveLength(0);
  });
});
