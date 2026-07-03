import {describe, it, expect} from 'vitest';
import {render, screen} from '@testing-library/react';
import React from 'react';

import StacCatalog from '../../src/theme/StacCatalog/index.js';
import StacCollection from '../../src/theme/StacCollection/index.js';
import StacItem from '../../src/theme/StacItem/index.js';
import {__setPluginData} from '../mocks/useGlobalData.js';
import type {
  NormalizedStacMapOptions,
  StacNode,
  StacPageData,
} from '../../src/types.js';

const mapDisabled: NormalizedStacMapOptions = {
  enabled: false,
  height: 360,
  footprintColor: '#e0114a',
};

function pageData(node: StacNode, over: Partial<StacPageData> = {}): StacPageData {
  return {
    node,
    routeBasePath: '/stac',
    map: mapDisabled,
    itemsPerPage: 25,
    searchEnabled: true,
    ...over,
  };
}

function baseNode(part: Partial<StacNode> & Pick<StacNode, 'type'>): StacNode {
  return {
    id: 'id',
    title: 'Title',
    routePath: '/stac/id',
    sourceHref: '/stac/id',
    depth: 1,
    children: [],
    lazyChildren: [],
    stac: {id: 'id', links: []} as StacNode['stac'],
    ...part,
  };
}

describe('StacCatalog', () => {
  it('renders header, description, search box and children', () => {
    __setPluginData({
      routeBasePath: '/stac',
      title: 'Root',
      map: mapDisabled,
      itemsPerPage: 25,
      search: true,
      tree: {id: 'root', type: 'Catalog', title: 'Root', routePath: '/stac', children: []},
      index: [],
    });
    const node = baseNode({
      type: 'Catalog',
      routePath: '/stac',
      title: 'Root Catalog',
      stac: {id: 'root', links: [], description: 'The root.'} as StacNode['stac'],
      children: [
        {id: 'c1', type: 'Collection', title: 'Coll 1', routePath: '/stac/c1'},
      ],
    });
    render(<StacCatalog data={pageData(node)} />);
    expect(screen.getByRole('heading', {name: 'Root Catalog'})).toBeInTheDocument();
    expect(screen.getByText('The root.')).toBeInTheDocument();
    expect(screen.getByText('Contents (1)')).toBeInTheDocument();
    expect(screen.getByText('Coll 1')).toBeInTheDocument();
    // Search box only shows at the root when enabled.
    expect(
      screen.getByPlaceholderText('Search the catalog…'),
    ).toBeInTheDocument();
  });

  it('hides the search box when not root', () => {
    const node = baseNode({
      type: 'Catalog',
      routePath: '/stac/sub',
      title: 'Sub',
      stac: {id: 'sub', links: []} as StacNode['stac'],
    });
    render(<StacCatalog data={pageData(node, {searchEnabled: false})} />);
    expect(
      screen.queryByPlaceholderText('Search the catalog…'),
    ).not.toBeInTheDocument();
  });
});

describe('StacCollection', () => {
  it('renders collection metadata and items', () => {
    const node = baseNode({
      type: 'Collection',
      routePath: '/stac/coll',
      title: 'My Collection',
      stac: {
        id: 'coll',
        links: [],
        description: 'A collection.',
        license: 'CC-BY-4.0',
        keywords: ['a', 'b'],
        extent: {
          spatial: {bbox: [[-1, -2, 1, 2]]},
          temporal: {interval: [['2020-01-01', '2020-12-31']]},
        },
        providers: [{name: 'Acme'}],
      } as StacNode['stac'],
      children: [
        {id: 'i1', type: 'Item', title: 'Item 1', routePath: '/stac/coll/i1'},
      ],
    });
    render(<StacCollection data={pageData(node)} />);
    expect(screen.getByText('A collection.')).toBeInTheDocument();
    expect(screen.getByText('CC-BY-4.0')).toBeInTheDocument();
    expect(screen.getByText('a, b')).toBeInTheDocument();
    expect(screen.getByText('-1, -2, 1, 2')).toBeInTheDocument();
    expect(
      screen.getByText('2020-01-01 00:00:00 UTC — 2020-12-31 00:00:00 UTC'),
    ).toBeInTheDocument();
    expect(screen.getByText('Acme')).toBeInTheDocument();
    expect(screen.getByText('Items (1)')).toBeInTheDocument();
    expect(screen.getByText('Item 1')).toBeInTheDocument();
  });

  it('handles a collection without extent/providers', () => {
    const node = baseNode({
      type: 'Collection',
      routePath: '/stac/coll',
      title: 'Bare',
      stac: {id: 'coll', links: []} as StacNode['stac'],
    });
    render(<StacCollection data={pageData(node)} />);
    expect(screen.getByRole('heading', {name: 'Bare'})).toBeInTheDocument();
    expect(screen.getByText('Items (0)')).toBeInTheDocument();
  });
});

describe('StacItem', () => {
  it('renders properties, assets, collection ref and parent link', () => {
    const node = baseNode({
      type: 'Item',
      routePath: '/stac/coll/item',
      title: 'The Item',
      parentRoutePath: '/stac/coll',
      stac: {
        id: 'item',
        links: [],
        collection: 'coll',
        bbox: [-1, -2, 1, 2],
        geometry: null,
        properties: {datetime: '2020-06-15T18:30:00Z', 'eo:cloud_cover': 3},
        assets: {thumb: {href: 'thumb.png', title: 'Thumb'}},
      } as StacNode['stac'],
    });
    render(<StacItem data={pageData(node)} />);
    expect(screen.getByRole('heading', {name: 'The Item'})).toBeInTheDocument();
    expect(screen.getByText('in collection coll')).toBeInTheDocument();
    expect(screen.getByText('Cloud cover')).toBeInTheDocument();
    expect(screen.getByText('Thumb')).toBeInTheDocument();
    expect(screen.getByText('← Back to parent')).toBeInTheDocument();
    // Map disabled → text footprint fallback.
    expect(screen.getByText('Bounding box')).toBeInTheDocument();
  });

  it('handles an item with no properties or parent', () => {
    const node = baseNode({
      type: 'Item',
      routePath: '/stac/item',
      title: 'Lonely',
      stac: {id: 'item', links: [], assets: {}} as StacNode['stac'],
    });
    render(<StacItem data={pageData(node)} />);
    expect(screen.getByRole('heading', {name: 'Lonely'})).toBeInTheDocument();
    expect(screen.queryByText('← Back to parent')).not.toBeInTheDocument();
  });
});
