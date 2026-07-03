import {describe, it, expect} from 'vitest';

import {buildStyle, footprintGeoJSON} from '../../src/theme/StacMap/style.js';
import type {NormalizedStacMapOptions, StacNode} from '../../src/types.js';

const baseMap: NormalizedStacMapOptions = {
  enabled: true,
  height: 360,
  footprintColor: '#e0114a',
};

function itemNode(stac: Record<string, unknown>): StacNode {
  return {
    id: 'i',
    type: 'Item',
    title: 'Item',
    routePath: '/stac/i',
    sourceHref: '/stac/i',
    depth: 1,
    children: [],
    stac: {id: 'i', links: [], ...stac} as StacNode['stac'],
  };
}

describe('buildStyle', () => {
  it('returns a user-supplied style object verbatim', () => {
    const custom = {version: 8, sources: {}, layers: [], custom: true};
    const style = buildStyle({...baseMap, style: custom});
    expect(style).toBe(custom);
  });

  it('builds a PMTiles vector style when a pmtilesUrl is given', () => {
    const style = buildStyle({
      ...baseMap,
      pmtilesUrl: 'https://x/tiles.pmtiles',
    });
    const sources = style.sources as Record<string, {url: string; attribution: string}>;
    expect(sources.basemap.url).toBe('pmtiles://https://x/tiles.pmtiles');
    expect(sources.basemap.attribution).toContain('Overture');
    expect((style.layers as unknown[]).length).toBeGreaterThan(1);
  });

  it('uses a custom attribution when provided', () => {
    const style = buildStyle({
      ...baseMap,
      pmtilesUrl: 'https://x/tiles.pmtiles',
      attribution: 'My attribution',
    });
    const sources = style.sources as Record<string, {attribution: string}>;
    expect(sources.basemap.attribution).toBe('My attribution');
  });

  it('falls back to a plain background style', () => {
    const style = buildStyle(baseMap);
    expect(style.sources).toEqual({});
    expect((style.layers as {id: string}[])[0].id).toBe('stac-background');
  });
});

describe('footprintGeoJSON', () => {
  it('wraps an existing geometry', () => {
    const geom = {type: 'Point', coordinates: [1, 2]};
    const gj = footprintGeoJSON(itemNode({geometry: geom}), undefined) as {
      geometry: unknown;
    };
    expect(gj.geometry).toBe(geom);
  });

  it('builds a polygon from a bbox when there is no geometry', () => {
    const gj = footprintGeoJSON(itemNode({}), [-1, -2, 1, 2]) as {
      geometry: {type: string; coordinates: number[][][]};
    };
    expect(gj.geometry.type).toBe('Polygon');
    expect(gj.geometry.coordinates[0]).toHaveLength(5);
    expect(gj.geometry.coordinates[0][0]).toEqual([-1, -2]);
  });

  it('returns an empty FeatureCollection when nothing is available', () => {
    const gj = footprintGeoJSON(itemNode({}), undefined) as {
      type: string;
      features: unknown[];
    };
    expect(gj.type).toBe('FeatureCollection');
    expect(gj.features).toEqual([]);
  });
});
