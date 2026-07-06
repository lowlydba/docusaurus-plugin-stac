import {describe, it, expect} from 'vitest';

import {findThumbnailHref} from '../../src/thumbnail.js';

describe('findThumbnailHref', () => {
  it('prefers an asset keyed "thumbnail"', () => {
    expect(
      findThumbnailHref({
        assets: {
          thumbnail: {href: 'thumb.png'},
          data: {href: 'data.tif'},
        },
      }),
    ).toBe('thumb.png');
  });

  it('falls back to an asset keyed "overview"', () => {
    expect(
      findThumbnailHref({
        assets: {overview: {href: 'overview.png'}, data: {href: 'data.tif'}},
      }),
    ).toBe('overview.png');
  });

  it('falls back to any asset with a "thumbnail"/"overview" role', () => {
    expect(
      findThumbnailHref({
        assets: {
          preview: {href: 'preview.jpg', roles: ['thumbnail']},
          data: {href: 'data.tif'},
        },
      }),
    ).toBe('preview.jpg');
  });

  it('is case-insensitive when matching roles', () => {
    expect(
      findThumbnailHref({
        assets: {preview: {href: 'preview.jpg', roles: ['THUMBNAIL']}},
      }),
    ).toBe('preview.jpg');
  });

  it('falls back to a rel:"thumbnail" link when there are no matching assets', () => {
    expect(
      findThumbnailHref({
        links: [
          {rel: 'self', href: 'self.json'},
          {rel: 'thumbnail', href: 'link-thumb.png'},
        ],
      }),
    ).toBe('link-thumb.png');
  });

  it('falls back to a rel:"preview" link', () => {
    expect(
      findThumbnailHref({
        links: [{rel: 'preview', href: 'link-preview.png'}],
      }),
    ).toBe('link-preview.png');
  });

  it('prefers assets over links', () => {
    expect(
      findThumbnailHref({
        assets: {thumbnail: {href: 'asset-thumb.png'}},
        links: [{rel: 'thumbnail', href: 'link-thumb.png'}],
      }),
    ).toBe('asset-thumb.png');
  });

  it('returns undefined when nothing matches', () => {
    expect(
      findThumbnailHref({
        assets: {data: {href: 'data.tif'}},
        links: [{rel: 'self', href: 'self.json'}],
      }),
    ).toBeUndefined();
  });

  it('returns undefined for an object with no assets or links', () => {
    expect(findThumbnailHref({})).toBeUndefined();
  });
});
