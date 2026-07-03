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

  it('does not cap local Items (they cannot be lazily fetched in-browser)', async () => {
    const {nodes} = await walkCatalog(fixtureRoot, {
      routeBasePath: '/stac',
      maxDepth: Number.POSITIVE_INFINITY,
      maxItemsPerCollection: 1,
    });
    const items = nodes.filter((n) => n.type === 'Item');
    // Local catalogs are always fully materialized regardless of the cap, since
    // a browser can't fetch un-served local files and local reads are cheap.
    expect(items.map((n) => n.id).sort()).toEqual([
      'deep-item',
      'item-3d',
      'item-point',
    ]);
    // No lazy deferral happens for local sources.
    expect(nodes.every((n) => n.lazyChildren.length === 0)).toBe(true);
    // Sub-catalogs/collections are still fully walked.
    expect(nodes.filter((n) => n.id === 'dup-collection')).toHaveLength(2);
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

  it('defers remote Items past the cap to lazyChildren without fetching them', async () => {
    const docs: Record<string, unknown> = {
      'https://cat.test/catalog.json': {
        type: 'Collection',
        id: 'http-coll',
        extent: {},
        links: [
          {rel: 'item', href: 'a.json', title: 'Item A'},
          {rel: 'item', href: 'b.json', title: 'Item B'},
          {rel: 'item', href: 'c.json', title: 'Item C'},
          {rel: 'child', href: 'sub/catalog.json'},
        ],
      },
      'https://cat.test/a.json': {type: 'Feature', id: 'a', properties: {}, assets: {}, links: []},
      'https://cat.test/b.json': {type: 'Feature', id: 'b', properties: {}, assets: {}, links: []},
      'https://cat.test/sub/catalog.json': {type: 'Catalog', id: 'http-sub', links: []},
    };
    const fetchMock = vi.fn(async (url: string) => {
      if (!(url in docs)) throw new Error(`unexpected fetch: ${url}`);
      return {
        ok: true,
        status: 200,
        statusText: 'OK',
        text: async () => JSON.stringify(docs[url]),
      };
    });
    vi.stubGlobal('fetch', fetchMock);

    const {root, nodes} = await walkCatalog('https://cat.test/catalog.json', {
      routeBasePath: '/stac',
      maxDepth: Number.POSITIVE_INFINITY,
      maxItemsPerCollection: 2,
    });

    // Two items materialized; the third is deferred (never fetched).
    expect(nodes.filter((n) => n.type === 'Item').map((n) => n.id).sort()).toEqual([
      'a',
      'b',
    ]);
    expect(root.lazyChildren).toEqual([
      {href: 'https://cat.test/c.json', title: 'Item C'},
    ]);
    // c.json is never requested; the child catalog is still followed.
    const fetched = fetchMock.mock.calls.map((c) => c[0]);
    expect(fetched).not.toContain('https://cat.test/c.json');
    expect(nodes.find((n) => n.id === 'http-sub')).toBeDefined();
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

  it('retries a transient network error then succeeds', async () => {
    const fetchMock = vi
      .fn()
      .mockRejectedValueOnce(new Error('ECONNRESET'))
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        statusText: 'OK',
        text: async () => JSON.stringify({type: 'Catalog', id: 'r', links: []}),
      });
    vi.stubGlobal('fetch', fetchMock);

    const {root} = await walkCatalog('https://cat.test/catalog.json', {
      routeBasePath: '/stac',
      maxDepth: Number.POSITIVE_INFINITY,
    });
    expect(root.id).toBe('r');
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('throws after exhausting retries on persistent network errors', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('ENETDOWN')));
    await expect(
      walkCatalog('https://cat.test/catalog.json', {
        routeBasePath: '/stac',
        maxDepth: Number.POSITIVE_INFINITY,
      }),
    ).rejects.toThrow(/network error fetching/);
  });
});
