import {describe, it, expect} from 'vitest';

import {
  prettifyKey,
  getFieldLabel,
  formatFieldValue,
  formatProperties,
  FIELD_REGISTRY,
} from '../../src/fields/registry.js';

describe('prettifyKey', () => {
  it('expands known extension prefixes', () => {
    expect(prettifyKey('eo:cloud_cover')).toBe('EO cloud cover');
    expect(prettifyKey('view:sun_elevation')).toBe('View sun elevation');
  });

  it('title-cases unknown prefixes', () => {
    expect(prettifyKey('custom:my_field')).toBe('Custom my field');
  });

  it('handles unprefixed keys and acronyms', () => {
    expect(prettifyKey('platform')).toBe('Platform');
    expect(prettifyKey('gsd')).toBe('GSD');
  });
});

describe('getFieldLabel', () => {
  it('uses the registry when available', () => {
    expect(getFieldLabel('eo:cloud_cover')).toBe('Cloud cover');
    expect(getFieldLabel('datetime')).toBe('Acquired');
  });

  it('falls back to the prettifier', () => {
    expect(getFieldLabel('unknown:thing')).toBe('Unknown thing');
  });
});

describe('formatFieldValue', () => {
  it('renders null/undefined as an em dash', () => {
    expect(formatFieldValue('datetime', null)).toBe('\u2014');
    expect(formatFieldValue('datetime', undefined)).toBe('\u2014');
  });

  it('formats registered numeric fields with units', () => {
    expect(formatFieldValue('eo:cloud_cover', 12.3456)).toBe('12.346 %');
    expect(formatFieldValue('gsd', 10)).toBe('10 m');
    expect(formatFieldValue('view:off_nadir', 3.14159)).toBe('3.142\u00b0');
  });

  it('formats datetimes both registered and auto-detected', () => {
    expect(formatFieldValue('datetime', '2020-06-15T18:30:00Z')).toBe(
      '2020-06-15 18:30:00 UTC',
    );
    expect(formatFieldValue('some_time', '2020-06-15T18:30:00Z')).toBe(
      '2020-06-15 18:30:00 UTC',
    );
  });

  it('passes plain strings, numbers and booleans through', () => {
    expect(formatFieldValue('platform', 'sentinel-2')).toBe('sentinel-2');
    expect(formatFieldValue('proj:epsg', 32610)).toBe('32610');
    expect(formatFieldValue('anything', true)).toBe('true');
  });

  it('joins lists', () => {
    expect(formatFieldValue('instruments', ['msi', 'oli'])).toBe('msi, oli');
    expect(formatFieldValue('random_list', [1, 2, 3])).toBe('1, 2, 3');
  });

  it('formats eo:bands via the band formatter', () => {
    expect(
      formatFieldValue('eo:bands', [
        {common_name: 'red'},
        {name: 'B08'},
        {description: 'panchromatic'},
        {},
        'raw',
      ]),
    ).toBe('red, B08, panchromatic, band, raw');
  });

  it('handles non-array inputs to list/band formatters', () => {
    expect(formatFieldValue('instruments', 'msi')).toBe('msi');
    expect(formatFieldValue('eo:bands', 'nope')).toBe('nope');
  });

  it('stringifies objects as JSON', () => {
    expect(formatFieldValue('meta', {a: 1})).toBe('{"a":1}');
  });

  it('handles NaN numbers in the number formatter', () => {
    expect(formatFieldValue('gsd', NaN)).toBe('NaN');
  });

  it('returns the raw string for an invalid date', () => {
    expect(FIELD_REGISTRY.datetime.format?.('not-a-date')).toBe('not-a-date');
    expect(FIELD_REGISTRY.datetime.format?.(42)).toBe('42');
  });
});

describe('formatProperties', () => {
  it('produces stable key/label/value triples', () => {
    const rows = formatProperties({
      'eo:cloud_cover': 5,
      platform: 'landsat-8',
    });
    expect(rows).toEqual([
      {key: 'eo:cloud_cover', label: 'Cloud cover', value: '5 %'},
      {key: 'platform', label: 'Platform', value: 'landsat-8'},
    ]);
  });
});
