import {describe, it, expect} from 'vitest';

import {
  normalizeRouteBase,
  normalizeMap,
  normalizeOptions,
  normalizeNotFoundHint,
  DEFAULT_ROUTE_BASE,
  DEFAULT_MAP_HEIGHT,
  DEFAULT_FOOTPRINT_COLOR,
  DEFAULT_ITEMS_PER_PAGE,
  DEFAULT_MAX_ITEMS_PER_COLLECTION,
} from '../../src/options.js';

describe('normalizeRouteBase', () => {
  it('prepends a leading slash', () => {
    expect(normalizeRouteBase('stac')).toBe('/stac');
  });

  it('strips trailing slashes but keeps root "/"', () => {
    expect(normalizeRouteBase('/stac/')).toBe('/stac');
    expect(normalizeRouteBase('/')).toBe('/');
  });

  it('trims whitespace', () => {
    expect(normalizeRouteBase('  /data/  ')).toBe('/data');
  });
});

describe('normalizeMap', () => {
  it('disables the map when false', () => {
    const m = normalizeMap(false);
    expect(m.enabled).toBe(false);
    expect(m.height).toBe(DEFAULT_MAP_HEIGHT);
    expect(m.footprintColor).toBe(DEFAULT_FOOTPRINT_COLOR);
  });

  it('enables with defaults when undefined', () => {
    const m = normalizeMap(undefined);
    expect(m.enabled).toBe(true);
    expect(m.height).toBe(DEFAULT_MAP_HEIGHT);
  });

  it('carries through supplied fields', () => {
    const m = normalizeMap({
      enabled: false,
      pmtilesUrl: 'https://x/tiles.pmtiles',
      height: 500,
      footprintColor: '#000',
      attribution: 'Me',
      style: {version: 8},
    });
    expect(m.enabled).toBe(false);
    expect(m.pmtilesUrl).toBe('https://x/tiles.pmtiles');
    expect(m.height).toBe(500);
    expect(m.footprintColor).toBe('#000');
    expect(m.attribution).toBe('Me');
    expect(m.style).toEqual({version: 8});
  });
});

describe('normalizeOptions', () => {
  it('throws when path is missing', () => {
    expect(() => normalizeOptions({} as never)).toThrow(/path/);
    expect(() => normalizeOptions(undefined as never)).toThrow(/path/);
  });

  it('applies defaults', () => {
    const o = normalizeOptions({path: './catalog.json'});
    expect(o.routeBasePath).toBe(DEFAULT_ROUTE_BASE);
    expect(o.id).toBe('default');
    expect(o.maxDepth).toBe(Number.POSITIVE_INFINITY);
    expect(o.maxItemsPerCollection).toBe(DEFAULT_MAX_ITEMS_PER_COLLECTION);
    expect(o.itemsPerPage).toBe(DEFAULT_ITEMS_PER_PAGE);
    expect(o.search).toBe(true);
    expect(o.map.enabled).toBe(true);
  });

  it('normalizes maxItemsPerCollection (floors, allows 0, Infinity opt-out, rejects negatives)', () => {
    expect(
      normalizeOptions({path: 'c', maxItemsPerCollection: 12.7}).maxItemsPerCollection,
    ).toBe(12);
    expect(
      normalizeOptions({path: 'c', maxItemsPerCollection: 0}).maxItemsPerCollection,
    ).toBe(0);
    expect(
      normalizeOptions({
        path: 'c',
        maxItemsPerCollection: Number.POSITIVE_INFINITY,
      }).maxItemsPerCollection,
    ).toBe(Number.POSITIVE_INFINITY);
    expect(
      normalizeOptions({path: 'c', maxItemsPerCollection: -3}).maxItemsPerCollection,
    ).toBe(DEFAULT_MAX_ITEMS_PER_COLLECTION);
  });

  it('honors explicit overrides and floors itemsPerPage', () => {
    const o = normalizeOptions({
      path: './c.json',
      routeBasePath: 'data',
      id: 'alt',
      title: 'My Catalog',
      maxDepth: 3,
      itemsPerPage: 10.9,
      search: false,
      map: false,
    });
    expect(o.routeBasePath).toBe('/data');
    expect(o.id).toBe('alt');
    expect(o.title).toBe('My Catalog');
    expect(o.maxDepth).toBe(3);
    expect(o.itemsPerPage).toBe(10);
    expect(o.search).toBe(false);
    expect(o.map.enabled).toBe(false);
  });

  it('falls back to the default itemsPerPage for invalid values', () => {
    expect(normalizeOptions({path: 'c', itemsPerPage: 0}).itemsPerPage).toBe(
      DEFAULT_ITEMS_PER_PAGE,
    );
    expect(
      normalizeOptions({path: 'c', itemsPerPage: -5}).itemsPerPage,
    ).toBe(DEFAULT_ITEMS_PER_PAGE);
  });

  it('threads a valid notFoundHint through', () => {
    const o = normalizeOptions({
      path: 'c',
      notFoundHint: {
        title: 'Gone?',
        description: 'It aged out.',
        links: [{label: 'Policy', href: '/policy'}],
      },
    });
    expect(o.notFoundHint).toEqual({
      title: 'Gone?',
      description: 'It aged out.',
      links: [{label: 'Policy', href: '/policy'}],
    });
  });

  it('omits notFoundHint entirely when not configured', () => {
    expect(normalizeOptions({path: 'c'}).notFoundHint).toBeUndefined();
  });
});

describe('normalizeNotFoundHint', () => {
  it('returns undefined for an unset hint', () => {
    expect(normalizeNotFoundHint(undefined)).toBeUndefined();
  });

  it('returns undefined when title/description/links are all empty', () => {
    expect(normalizeNotFoundHint({})).toBeUndefined();
    expect(normalizeNotFoundHint({links: []})).toBeUndefined();
  });

  it('keeps a title-only hint', () => {
    expect(normalizeNotFoundHint({title: 'Gone?'})).toEqual({title: 'Gone?'});
  });

  it('drops malformed link entries but keeps well-formed ones', () => {
    const hint = normalizeNotFoundHint({
      links: [
        {label: 'Good', href: '/good'},
        {label: 'Missing href'} as never,
        {href: '/missing-label'} as never,
      ],
    });
    expect(hint?.links).toEqual([{label: 'Good', href: '/good'}]);
  });

  it('omits the links field entirely when every entry was malformed', () => {
    const hint = normalizeNotFoundHint({
      description: 'Still has a description.',
      links: [{label: 'Missing href'} as never],
    });
    expect(hint).toEqual({description: 'Still has a description.'});
    expect(hint).not.toHaveProperty('links');
  });
});
