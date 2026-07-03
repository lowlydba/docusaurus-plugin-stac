import {describe, it, expect} from 'vitest';

import {
  normalizeExtent,
  normalizeBbox,
  normalizeStacObject,
} from '../../src/stac-normalize.js';
import type {StacObject} from '../../src/types.js';

describe('normalizeExtent', () => {
  it('returns undefined for non-objects', () => {
    expect(normalizeExtent(null)).toBeUndefined();
    expect(normalizeExtent([1, 2, 3])).toBeUndefined();
  });

  it('upgrades flat 0.6-0.8 spatial/temporal arrays', () => {
    const out = normalizeExtent({
      spatial: [-1, -2, 1, 2],
      temporal: ['2020-01-01', '2020-12-31'],
    });
    expect(out?.spatial?.bbox).toEqual([[-1, -2, 1, 2]]);
    expect(out?.temporal?.interval).toEqual([['2020-01-01', '2020-12-31']]);
  });

  it('wraps a single flat bbox into array-of-arrays', () => {
    const out = normalizeExtent({spatial: {bbox: [-1, -2, 1, 2]}});
    expect(out?.spatial?.bbox).toEqual([[-1, -2, 1, 2]]);
  });

  it('keeps an already-nested bbox and interval', () => {
    const out = normalizeExtent({
      spatial: {bbox: [[-1, -2, 1, 2]]},
      temporal: {interval: [['2020-01-01', null]]},
    });
    expect(out?.spatial?.bbox).toEqual([[-1, -2, 1, 2]]);
    expect(out?.temporal?.interval).toEqual([['2020-01-01', null]]);
  });

  it('wraps a single flat interval into array-of-arrays', () => {
    const out = normalizeExtent({temporal: {interval: ['2020-01-01', null]}});
    expect(out?.temporal?.interval).toEqual([['2020-01-01', null]]);
  });

  it('returns undefined when neither spatial nor temporal is present', () => {
    expect(normalizeExtent({foo: 'bar'})).toBeUndefined();
  });
});

describe('normalizeBbox', () => {
  it('returns undefined for non-arrays', () => {
    expect(normalizeBbox('nope')).toBeUndefined();
  });

  it('collapses a 3D bbox to 2D', () => {
    expect(normalizeBbox([-1, -2, 0, 1, 2, 100])).toEqual([-1, -2, 1, 2]);
  });

  it('passes a 2D bbox through', () => {
    expect(normalizeBbox([-1, -2, 1, 2])).toEqual([-1, -2, 1, 2]);
  });

  it('returns undefined for too-short arrays', () => {
    expect(normalizeBbox([1, 2, 3])).toBeUndefined();
  });
});

describe('normalizeStacObject', () => {
  it('normalizes an Item: type, properties, geometry, bbox', () => {
    const out = normalizeStacObject(
      {id: 'i', bbox: [1, 2, 0, 3, 4, 9]} as unknown as StacObject,
      'Item',
    );
    expect(out.type).toBe('Feature');
    expect((out as {properties: unknown}).properties).toEqual({});
    expect((out as {geometry: unknown}).geometry).toBeNull();
    expect((out as {bbox: number[]}).bbox).toEqual([1, 2, 3, 4]);
    expect(out.stac_version).toBe('0.0.0');
    expect(Array.isArray(out.links)).toBe(true);
  });

  it('preserves an existing Item geometry and properties', () => {
    const geom = {type: 'Point', coordinates: [0, 0]};
    const out = normalizeStacObject(
      {
        id: 'i',
        stac_version: '1.0.0',
        properties: {datetime: 'x'},
        geometry: geom,
        links: [],
      } as unknown as StacObject,
      'Item',
    );
    expect((out as {geometry: unknown}).geometry).toBe(geom);
    expect((out as {properties: {datetime: string}}).properties.datetime).toBe(
      'x',
    );
  });

  it('normalizes a Collection extent and sets type', () => {
    const out = normalizeStacObject(
      {
        id: 'c',
        extent: {spatial: [-1, -2, 1, 2]},
        links: [],
      } as unknown as StacObject,
      'Collection',
    );
    expect(out.type).toBe('Collection');
    expect((out as {extent: {spatial: {bbox: number[][]}}}).extent.spatial.bbox).toEqual(
      [[-1, -2, 1, 2]],
    );
  });

  it('drops an unusable Collection extent', () => {
    const out = normalizeStacObject(
      {id: 'c', extent: {foo: 1}, links: []} as unknown as StacObject,
      'Collection',
    );
    expect('extent' in out).toBe(false);
  });

  it('marks a Catalog and does not mutate the input', () => {
    const input = {id: 'cat', links: [{rel: 'child', href: 'x'}]} as StacObject;
    const out = normalizeStacObject(input, 'Catalog');
    expect(out.type).toBe('Catalog');
    expect(out).not.toBe(input);
    expect(input.type).toBeUndefined();
  });
});
