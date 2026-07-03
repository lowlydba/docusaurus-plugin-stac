import {describe, it, expect, vi, beforeEach} from 'vitest';
import {render, screen, waitFor} from '@testing-library/react';
import React from 'react';

import StacMap from '../../src/theme/StacMap/index.js';
import type {NormalizedStacMapOptions, StacNode} from '../../src/types.js';

const mocks = vi.hoisted(() => ({
  addControl: vi.fn(),
  addSource: vi.fn(),
  addLayer: vi.fn(),
  fitBounds: vi.fn(),
  remove: vi.fn(),
  addProtocol: vi.fn(),
  lastMapOptions: {value: null as unknown},
}));

vi.mock('maplibre-gl/dist/maplibre-gl.css', () => ({default: {}}));
vi.mock('pmtiles', () => ({
  Protocol: class {
    tile = (): void => undefined;
  },
}));
vi.mock('maplibre-gl', () => {
  class MapMock {
    constructor(opts: unknown) {
      mocks.lastMapOptions.value = opts;
    }
    on(evt: string, cb: () => void): void {
      if (evt === 'load') cb();
    }
    addControl(...a: unknown[]): void {
      mocks.addControl(...a);
    }
    addSource(...a: unknown[]): void {
      mocks.addSource(...a);
    }
    addLayer(...a: unknown[]): void {
      mocks.addLayer(...a);
    }
    fitBounds(...a: unknown[]): void {
      mocks.fitBounds(...a);
    }
    remove(): void {
      mocks.remove();
    }
  }
  class NavigationControl {}
  return {default: {Map: MapMock, NavigationControl, addProtocol: mocks.addProtocol}};
});

const enabledMap: NormalizedStacMapOptions = {
  enabled: true,
  height: 360,
  footprintColor: '#e0114a',
};

function itemNode(stac: Record<string, unknown>): StacNode {
  return {
    id: 'i',
    type: 'Item',
    title: 'The Item',
    routePath: '/stac/i',
    sourceHref: '/stac/i',
    depth: 1,
    children: [],
    stac: {id: 'i', links: [], ...stac} as StacNode['stac'],
  };
}

describe('StacMap', () => {
  beforeEach(() => {
    Object.values(mocks).forEach((m) => {
      if (typeof (m as {mockClear?: () => void}).mockClear === 'function') {
        (m as {mockClear: () => void}).mockClear();
      }
    });
    mocks.lastMapOptions.value = null;
  });

  it('renders a text footprint when the map is disabled', () => {
    render(<StacMap node={itemNode({bbox: [-1, -2, 1, 2]})} map={{...enabledMap, enabled: false}} />);
    expect(screen.getByText('Bounding box')).toBeInTheDocument();
    expect(mocks.addSource).not.toHaveBeenCalled();
  });

  it('initializes a polygon footprint with a PMTiles basemap', async () => {
    const node = itemNode({
      bbox: [-1, -2, 1, 2],
      geometry: {
        type: 'Polygon',
        coordinates: [[[-1, -2], [1, -2], [1, 2], [-1, 2], [-1, -2]]],
      },
    });
    render(
      <StacMap
        node={node}
        map={{...enabledMap, pmtilesUrl: 'https://x/tiles.pmtiles'}}
      />,
    );

    await waitFor(() => expect(mocks.addSource).toHaveBeenCalled());
    expect(mocks.addProtocol).toHaveBeenCalledWith('pmtiles', expect.anything());
    // Polygon → fill + line layers.
    const layerIds = mocks.addLayer.mock.calls.map((c) => (c[0] as {id: string}).id);
    expect(layerIds).toContain('stac-footprint-fill');
    expect(layerIds).toContain('stac-footprint-line');
    expect(mocks.fitBounds).toHaveBeenCalled();
    expect(mocks.addControl).toHaveBeenCalled();
  });

  it('uses a circle layer for point geometry', async () => {
    const node = itemNode({
      geometry: {type: 'Point', coordinates: [5, 6]},
    });
    render(<StacMap node={node} map={enabledMap} />);

    await waitFor(() => expect(mocks.addLayer).toHaveBeenCalled());
    const layerIds = mocks.addLayer.mock.calls.map((c) => (c[0] as {id: string}).id);
    expect(layerIds).toContain('stac-footprint-point');
    // No PMTiles → protocol never registered.
    expect(mocks.addProtocol).not.toHaveBeenCalled();
  });

  it('centers at [0,0] and skips fitBounds when there is no footprint', async () => {
    const node = itemNode({geometry: null});
    render(<StacMap node={node} map={enabledMap} />);

    await waitFor(() => expect(mocks.addSource).toHaveBeenCalled());
    expect(mocks.fitBounds).not.toHaveBeenCalled();
    expect((mocks.lastMapOptions.value as {center: number[]}).center).toEqual([0, 0]);
  });

  it('removes the map instance on unmount', async () => {
    const node = itemNode({bbox: [-1, -2, 1, 2]});
    const {unmount} = render(<StacMap node={node} map={enabledMap} />);
    await waitFor(() => expect(mocks.addSource).toHaveBeenCalled());
    unmount();
    expect(mocks.remove).toHaveBeenCalled();
  });
});
