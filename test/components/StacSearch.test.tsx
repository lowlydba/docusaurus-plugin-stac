import {describe, it, expect, beforeEach} from 'vitest';
import {render, screen, fireEvent} from '@testing-library/react';
import React from 'react';

import StacSearch from '../../src/theme/StacSearch/index.js';
import {__setPluginData} from '../mocks/useGlobalData.js';
import type {StacGlobalData} from '../../src/types.js';

const data: StacGlobalData = {
  routeBasePath: '/stac',
  title: 'Root',
  map: {enabled: false, height: 360, footprintColor: '#e0114a'},
  itemsPerPage: 25,
  search: true,
  tree: {id: 'root', type: 'Catalog', title: 'Root', routePath: '/stac', children: []},
  index: [
    {id: 'oak', type: 'Item', title: 'Oakland Scene', routePath: '/stac/oak'},
    {id: 'sf', type: 'Item', title: 'San Francisco', routePath: '/stac/sf'},
  ],
};

describe('StacSearch', () => {
  beforeEach(() => {
    __setPluginData(data);
  });

  it('renders nothing when there is no plugin data', () => {
    __setPluginData(undefined);
    const {container} = render(<StacSearch />);
    expect(container.firstChild).toBeNull();
  });

  it('shows matching results as the user types', () => {
    render(<StacSearch />);
    const input = screen.getByPlaceholderText('Search the catalog…');
    fireEvent.change(input, {target: {value: 'oak'}});
    expect(screen.getByText('Oakland Scene')).toBeInTheDocument();
    expect(screen.queryByText('San Francisco')).not.toBeInTheDocument();
  });

  it('shows a no-results message', () => {
    render(<StacSearch />);
    const input = screen.getByPlaceholderText('Search the catalog…');
    fireEvent.change(input, {target: {value: 'zzz'}});
    expect(screen.getByText('No matches for “zzz”.')).toBeInTheDocument();
  });

  it('hides the results panel when the query is cleared', () => {
    render(<StacSearch />);
    const input = screen.getByPlaceholderText('Search the catalog…');
    fireEvent.change(input, {target: {value: 'sf'}});
    expect(screen.getByText('San Francisco')).toBeInTheDocument();
    fireEvent.change(input, {target: {value: ''}});
    expect(screen.queryByText('San Francisco')).not.toBeInTheDocument();
  });
});
