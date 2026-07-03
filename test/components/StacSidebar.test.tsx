import {describe, it, expect} from 'vitest';
import {render, screen, within, fireEvent} from '@testing-library/react';
import React from 'react';

import StacSidebar from '../../src/theme/StacSidebar/index.js';
import {__setPluginData} from '../mocks/useGlobalData.js';
import type {StacGlobalData, StacNavNode} from '../../src/types.js';

const mapDisabled: StacGlobalData['map'] = {
  enabled: false,
  height: 360,
  footprintColor: '#e0114a',
};

const tree: StacNavNode = {
  id: 'root',
  type: 'Catalog',
  title: 'Root Catalog',
  routePath: '/stac',
  children: [
    {
      id: 'coll-a',
      type: 'Collection',
      title: 'Collection A',
      routePath: '/stac/coll-a',
      children: [
        {
          id: 'item-1',
          type: 'Item',
          title: 'Item 1',
          routePath: '/stac/coll-a/item-1',
          children: [],
        },
        {
          id: 'item-2',
          type: 'Item',
          title: 'Item 2',
          routePath: '/stac/coll-a/item-2',
          children: [],
        },
      ],
    },
    {
      id: 'coll-b',
      type: 'Collection',
      title: 'Collection B',
      routePath: '/stac/coll-b',
      children: [
        {
          id: 'item-3',
          type: 'Item',
          title: 'Item 3',
          routePath: '/stac/coll-b/item-3',
          children: [],
        },
      ],
    },
  ],
};

function setTreeData(): void {
  __setPluginData({
    routeBasePath: '/stac',
    title: 'Root',
    map: mapDisabled,
    itemsPerPage: 25,
    search: true,
    sidebar: true,
    tree,
    index: [],
  } as StacGlobalData);
}

describe('StacSidebar', () => {
  it('renders nothing when plugin data is unavailable', () => {
    __setPluginData(undefined);
    const {container} = render(<StacSidebar activeRoutePath="/stac" />);
    expect(container).toBeEmptyDOMElement();
  });

  it('expands the path down to the active node, but not unrelated siblings', () => {
    setTreeData();
    render(<StacSidebar activeRoutePath="/stac/coll-a/item-2" />);

    // Ancestors + the active node itself are visible.
    expect(screen.getByRole('link', {name: /Root Catalog/})).toBeInTheDocument();
    expect(screen.getByRole('link', {name: /Collection A/})).toBeInTheDocument();
    expect(screen.getByRole('link', {name: /Item 1/})).toBeInTheDocument();
    const activeLink = screen.getByRole('link', {name: /Item 2/});
    expect(activeLink).toBeInTheDocument();
    expect(activeLink).toHaveAttribute('aria-current', 'page');

    // A sibling branch (Collection B) is present but collapsed by default —
    // its own child (Item 3) is not rendered until expanded.
    expect(screen.getByRole('link', {name: /Collection B/})).toBeInTheDocument();
    expect(screen.queryByRole('link', {name: /Item 3/})).not.toBeInTheDocument();
  });

  it('expands a collapsed branch on toggle click', () => {
    setTreeData();
    render(<StacSidebar activeRoutePath="/stac" />);

    expect(screen.queryByRole('link', {name: /Item 3/})).not.toBeInTheDocument();

    const collBRow = screen.getByRole('link', {name: /Collection B/}).closest('.stac-tree__row');
    const toggle = within(collBRow as HTMLElement).getByRole('button');
    fireEvent.click(toggle);

    expect(screen.getByRole('link', {name: /Item 3/})).toBeInTheDocument();
  });

  it('renders a non-interactive placeholder toggle for leaf nodes', () => {
    setTreeData();
    render(<StacSidebar activeRoutePath="/stac/coll-a/item-1" />);
    const itemRow = screen
      .getByRole('link', {name: /Item 1/})
      .closest('.stac-tree__row');
    expect(
      within(itemRow as HTMLElement).queryByRole('button'),
    ).not.toBeInTheDocument();
  });
});
