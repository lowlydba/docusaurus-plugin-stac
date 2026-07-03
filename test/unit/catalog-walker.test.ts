import {describe, it, expect, vi, afterEach} from 'vitest';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

import {
  walkCatalog,
  resolveHref,
  slugify,
} from '../../src/catalog-walker.js';

const dir = path.dirname(fileURLToPath(import.meta.url));
const fixtureRoot = path.resolve(dir, '../fixtures/catalog/catalog.json');

describe('slugify', () => {
  it('lowercases and replaces non-alphanumerics with dashes', () => {
    expect(slugify('Hello World!')).toBe('hello-world');
    expect(slugify('  Trim__Me--now  ')).toBe('trim-me-now');
  });

  it('falls back to "item" for empty results', () => {
    expect(slugify('!!!')).toBe('item');
    expect(slugify('')).toBe('item');
  });
});

describe('resolveHref', () => {
  it('returns absolute http hrefs unchanged', () => {
    expect(resolveHref('/local/base.json', 'https://x.test/a.json')).toBe(
      'https://x.test/a.json',
    );
  });

  it('resolves relative hrefs against an http base', () => {
    expect(resolveHref('https://x.test/dir/base.json', '../a.json')).toBe(
      'https://x.test/a.json',
    );
  });

  it('resolves relative filesystem hrefs against the base dir', () => {
    const resolved = resolveHref(
      path.join('/root', 'dir', 'base.json'),
      'child.json',
    );
    expect(resolved).toBe(path.resolve('/root/dir', 'child.json'));
  });

  it('normalizes an absolute filesystem href', () => {
    const abs = path.resolve('/root/dir/../a.json');
    expect(resolveHref('/root/base.json', abs)).toBe(path.normalize(abs));
  });
});

describe('walkCatalog (filesystem fixture)', () => {
  it('walks child/item links, dedupes routes, guards cycles', async () => {
    const {root, nodes} = await walkCatalog(fixtureRoot, {
      routeBasePath: '/stac',
      maxDepth: Number.POSITIVE_INFINITY,
    });

    expect(root.type).toBe('Catalog');
    expect(root.routePath).toBe('/stac');

    const byRoute = new Map(nodes.map((n) => [n.routePath, n]));

    // Legacy collection detected via extent/license despite missing `type`.
    const collA = nodes.find((n) => n.id === 'collection-a');
    expect(collA?.type).toBe('Collection');
    expect(collA?.routePath).toBe('/stac/collection-a');

    // Items resolved under the collection.
    expect(nodes.find((n) => n.id === 'item-3d')?.type).toBe('Item');
    expect(nodes.find((n) => n.id === 'item-point')?.type).toBe('Item');

    // Two collections share the id "dup-collection" → route dedup suffix.
    const dups = nodes.filter((n) => n.id === 'dup-collection');
    expect(dups).toHaveLength(2);
    const dupRoutes = dups.map((d) => d.routePath).sort();
    expect(dupRoutes).toEqual([
      '/stac/sub/dup-collection',
      '/stac/sub/dup-collection-2',
    ]);

    // Cycle guard: collection-a links back to root, which must not re-appear.
    const rootAppearances = nodes.filter((n) => n.id === 'root-catalog');
    expect(rootAppearances).toHaveLength(1);

    // The child link without an href is skipped (no crash).
    expect(byRoute.get('/stac')?.children.some((c) => !c.routePath)).toBe(false);
  });

  it('stops descending at maxDepth', async () => {
    const {nodes} = await walkCatalog(fixtureRoot, {
      routeBasePath: '/stac',
      maxDepth: 1,
    });
    // Depth 0 = root, depth 1 = collections/sub. Items (depth 2) must be absent.
    expect(nodes.find((n) => n.id === 'item-3d')).toBeUndefined();
    expect(nodes.find((n) => n.id === 'deep-item')).toBeUndefined();
    expect(nodes.every((n) => n.depth <= 1)).toBe(true);
  });
});

describe('walkCatalog (http, mocked fetch)', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('fetches over http and resolves relative links', async () => {
    const docs: Record<string, unknown> = {
      'https://cat.test/catalog.json': {
        type: 'Catalog',
        id: 'http-root',
        title: 'HTTP Root',
        links: [{rel: 'item', href: 'item.json'}],
      },
      'https://cat.test/item.json': {
        type: 'Feature',
        id: 'http-item',
        properties: {datetime: '2022-01-01T00:00:00Z'},
        geometry: null,
        assets: {},
        links: [],
      },
    };
    vi.stubGlobal(
      'fetch',
      vi.fn(async (url: string) => ({
        ok: true,
        status: 200,
        statusText: 'OK',
        text: async () => JSON.stringify(docs[url]),
      })),
    );

    const {root, nodes} = await walkCatalog('https://cat.test/catalog.json', {
      routeBasePath: '/stac',
      maxDepth: Number.POSITIVE_INFINITY,
    });
    expect(root.id).toBe('http-root');
    expect(nodes.find((n) => n.id === 'http-item')?.type).toBe('Item');
  });

  it('throws a helpful error on a failed http fetch', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => ({
        ok: false,
        status: 404,
        statusText: 'Not Found',
        text: async () => '',
      })),
    );
    await expect(
      walkCatalog('https://cat.test/missing.json', {
        routeBasePath: '/stac',
        maxDepth: Number.POSITIVE_INFINITY,
      }),
    ).rejects.toThrow(/failed to fetch/);
  });

  it('throws on invalid JSON', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => ({
        ok: true,
        status: 200,
        statusText: 'OK',
        text: async () => '{not json',
      })),
    );
    await expect(
      walkCatalog('https://cat.test/bad.json', {
        routeBasePath: '/stac',
        maxDepth: Number.POSITIVE_INFINITY,
      }),
    ).rejects.toThrow(/not valid JSON/);
  });
});
