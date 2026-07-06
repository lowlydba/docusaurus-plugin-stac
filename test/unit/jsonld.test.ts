import {describe, it, expect} from 'vitest';

import {buildDataset} from '../../src/jsonld.js';
import type {StacNode} from '../../src/types.js';

function node(
  stac: Record<string, unknown>,
  extra: Partial<StacNode> = {},
): StacNode {
  return {
    id: 'n',
    type: 'Item',
    title: 'Node',
    routePath: '/stac/n',
    sourceHref: 'https://cat.test/n.json',
    depth: 1,
    children: [],
    lazyChildren: [],
    stac: {id: 'n', links: [], ...stac} as StacNode['stac'],
    ...extra,
  };
}

const urls = {
  pageUrl: 'https://site.test/stac/n',
  jsonUrl: 'https://cat.test/n.json',
};

describe('buildDataset', () => {
  it('builds a Dataset for an Item with bbox, datetime and assets', () => {
    const ds = buildDataset(
      node(
        {
          type: 'Feature',
          bbox: [-122.5, 37.7, -122.3, 37.83],
          properties: {
            datetime: '2021-06-10T00:00:00Z',
            description: 'A scene',
          },
          assets: {
            visual: {
              href: 'https://cat.test/n/visual.tif',
              title: 'True color',
              type: 'image/tiff',
            },
          },
        },
        {title: 'Scene N', id: 'scene-n'},
      ),
      urls,
    );

    expect(ds['@context']).toBe('https://schema.org');
    expect(ds['@type']).toBe('Dataset');
    expect(ds.name).toBe('Scene N');
    expect(ds.identifier).toBe('scene-n');
    expect(ds.url).toBe(urls.pageUrl);
    expect(ds.description).toBe('A scene');
    expect(ds.temporalCoverage).toBe('2021-06-10T00:00:00Z');
    expect(ds.spatialCoverage).toEqual({
      '@type': 'Place',
      geo: {'@type': 'GeoShape', box: '37.7,-122.5 37.83,-122.3'},
    });
    // Canonical STAC JSON is the first distribution, then each asset.
    expect(ds.distribution[0]).toEqual({
      '@type': 'DataDownload',
      name: 'STAC JSON',
      encodingFormat: 'application/json',
      contentUrl: 'https://cat.test/n.json',
    });
    expect(ds.distribution[1]).toEqual({
      '@type': 'DataDownload',
      name: 'True color',
      encodingFormat: 'image/tiff',
      contentUrl: 'https://cat.test/n/visual.tif',
    });
  });

  it('sets image from a thumbnail asset when present', () => {
    const ds = buildDataset(
      node({
        type: 'Feature',
        assets: {
          thumbnail: {href: 'https://cat.test/n/thumb.jpg'},
        },
      }),
      urls,
    );
    expect(ds.image).toBe('https://cat.test/n/thumb.jpg');
  });

  it('omits image when no thumbnail can be resolved', () => {
    const ds = buildDataset(node({type: 'Feature', assets: {}}), urls);
    expect(ds.image).toBeUndefined();
  });

  it('derives temporalCoverage from start/end and 3D bbox from a Collection', () => {
    const ds = buildDataset(
      node(
        {
          type: 'Collection',
          license: 'CC-BY-4.0',
          keywords: ['sentinel', 'optical'],
          extent: {
            spatial: {bbox: [[-10, -5, 0, 10, 5, 100]]},
            temporal: {interval: [['2020-01-01T00:00:00Z', null]]},
          },
        },
        {type: 'Collection'},
      ),
      urls,
    );

    expect(ds.license).toBe('CC-BY-4.0');
    expect(ds.keywords).toEqual(['sentinel', 'optical']);
    expect(ds.temporalCoverage).toBe('2020-01-01T00:00:00Z/..');
    // 6-element bbox collapses to [w, s, e, n].
    expect(ds.spatialCoverage?.geo.box).toBe('-5,-10 5,10');
    // No assets → only the canonical JSON distribution.
    expect(ds.distribution).toHaveLength(1);
  });

  it('omits optional fields when absent', () => {
    const ds = buildDataset(
      node({type: 'Catalog', assets: {}}, {type: 'Catalog'}),
      urls,
    );
    expect(ds.description).toBeUndefined();
    expect(ds.spatialCoverage).toBeUndefined();
    expect(ds.temporalCoverage).toBeUndefined();
    expect(ds.keywords).toBeUndefined();
    expect(ds.license).toBeUndefined();
  });
});
