import {describe, it, expect, vi, afterEach} from 'vitest';
import {render, screen, fireEvent, within, waitFor} from '@testing-library/react';
import React from 'react';

import {
  formatValue,
  bboxFromGeometry,
  itemBbox,
  TypeBadge,
  Breadcrumbs,
  ChildList,
  LazyChildList,
  KeyValueTable,
  PropertiesTable,
  AssetList,
  FootprintText,
  StacHead,
  SourceJsonLink,
} from '../../src/theme/StacCommon/index.js';
import type {StacChildRef, StacLazyChildRef, StacNode} from '../../src/types.js';

function node(stac: Record<string, unknown>, extra: Partial<StacNode> = {}): StacNode {
  return {
    id: 'n',
    type: 'Item',
    title: 'Node',
    routePath: '/stac/n',
    sourceHref: '/stac/n',
    depth: 1,
    children: [],
    lazyChildren: [],
    stac: {id: 'n', links: [], ...stac} as StacNode['stac'],
    ...extra,
  };
}

describe('formatValue', () => {
  it('handles nullish, primitives and objects', () => {
    expect(formatValue(null)).toBe('\u2014');
    expect(formatValue(undefined)).toBe('\u2014');
    expect(formatValue('hi')).toBe('hi');
    expect(formatValue(3)).toBe('3');
    expect(formatValue(false)).toBe('false');
    expect(formatValue({a: 1})).toBe('{"a":1}');
  });
});

describe('bboxFromGeometry', () => {
  it('returns undefined for non-geometry or missing coordinates', () => {
    expect(bboxFromGeometry(null)).toBeUndefined();
    expect(bboxFromGeometry({})).toBeUndefined();
  });

  it('computes bounds from nested coordinates', () => {
    const geom = {
      type: 'Polygon',
      coordinates: [[[-1, -2], [3, -2], [3, 4], [-1, 4], [-1, -2]]],
    };
    expect(bboxFromGeometry(geom)).toEqual([-1, -2, 3, 4]);
  });

  it('returns undefined when there are no numeric coordinates', () => {
    expect(bboxFromGeometry({coordinates: []})).toBeUndefined();
  });
});

describe('itemBbox', () => {
  it('uses a 2D bbox directly', () => {
    expect(itemBbox(node({bbox: [-1, -2, 1, 2]}))).toEqual([-1, -2, 1, 2]);
  });

  it('collapses a 3D bbox', () => {
    expect(itemBbox(node({bbox: [-1, -2, 0, 1, 2, 9]}))).toEqual([-1, -2, 1, 2]);
  });

  it('falls back to geometry bounds', () => {
    const n = node({geometry: {type: 'Point', coordinates: [5, 6]}});
    expect(itemBbox(n)).toEqual([5, 6, 5, 6]);
  });
});

describe('TypeBadge', () => {
  it('renders the type label with a modifier class', () => {
    const {container} = render(<TypeBadge type="Collection" />);
    const badge = container.querySelector('.stac-badge');
    expect(badge?.textContent).toBe('Collection');
    expect(badge?.className).toContain('stac-badge--collection');
  });
});

describe('Breadcrumbs', () => {
  it('shows only the root link at the root', () => {
    render(
      <Breadcrumbs
        node={node({}, {routePath: '/stac'})}
        routeBasePath="/stac"
        rootTitle="Home"
      />,
    );
    expect(screen.getByText('Home')).toBeInTheDocument();
    expect(screen.queryByText('Node')).not.toBeInTheDocument();
  });

  it('shows the current crumb when not at the root', () => {
    render(
      <Breadcrumbs
        node={node({}, {routePath: '/stac/n', title: 'Deep'})}
        routeBasePath="/stac"
      />,
    );
    expect(screen.getByText('Catalog')).toBeInTheDocument();
    expect(screen.getByText('Deep')).toBeInTheDocument();
  });
});

describe('ChildList', () => {
  function refs(count: number): StacChildRef[] {
    return Array.from({length: count}, (_, i) => ({
      id: `c${i}`,
      type: 'Item' as const,
      title: `Child ${i}`,
      routePath: `/stac/c${i}`,
    }));
  }

  it('renders an empty state', () => {
    render(<ChildList children={[]} />);
    expect(screen.getByText('No child records.')).toBeInTheDocument();
  });

  it('renders all children with no pagination when they fit', () => {
    const {container} = render(<ChildList children={refs(3)} itemsPerPage={5} />);
    expect(container.querySelectorAll('.stac-child-list__item')).toHaveLength(3);
    expect(container.querySelector('.stac-pagination')).toBeNull();
  });

  it('paginates by toggling visibility while keeping all in the DOM', () => {
    const {container} = render(<ChildList children={refs(7)} itemsPerPage={3} />);
    const items = container.querySelectorAll('.stac-child-list__item');
    // All 7 are rendered (crawlable) even though only 3 are visible.
    expect(items).toHaveLength(7);
    const visible = Array.from(items).filter((li) => !li.hasAttribute('hidden'));
    expect(visible).toHaveLength(3);

    expect(screen.getByText('Page 1 of 3')).toBeInTheDocument();
    fireEvent.click(screen.getByText('Next'));
    expect(screen.getByText('Page 2 of 3')).toBeInTheDocument();
    // Previous returns to page 1.
    fireEvent.click(screen.getByText('Previous'));
    expect(screen.getByText('Page 1 of 3')).toBeInTheDocument();
  });

  it('treats a missing/zero itemsPerPage as a single page', () => {
    const {container} = render(<ChildList children={refs(4)} itemsPerPage={0} />);
    expect(container.querySelector('.stac-pagination')).toBeNull();
    const items = container.querySelectorAll('.stac-child-list__item');
    expect(Array.from(items).every((li) => !li.hasAttribute('hidden'))).toBe(true);
  });
});

describe('LazyChildList', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  const lazy = (n: number): StacLazyChildRef[] =>
    Array.from({length: n}, (_, i) => ({
      href: `https://cat.test/item-${i}.json`,
      title: `Lazy ${i}`,
    }));

  it('renders nothing when there are no lazy children', () => {
    const {container} = render(<LazyChildList lazyChildren={[]} />);
    expect(container.firstChild).toBeNull();
  });

  it('shows the on-demand note and a load button without fetching upfront', () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    render(<LazyChildList lazyChildren={lazy(3)} batchSize={2} />);
    expect(
      screen.getByText(/3 additional item\(s\) are loaded on demand/),
    ).toBeInTheDocument();
    expect(screen.getByRole('button', {name: 'Load 2 more'})).toBeInTheDocument();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('fetches and renders a batch of items on demand', async () => {
    const fetchMock = vi.fn(async (url: string) => {
      const idx = url.match(/item-(\d)/)?.[1] ?? 'x';
      return {
        ok: true,
        status: 200,
        statusText: 'OK',
        json: async () => ({
          type: 'Feature',
          id: `remote-${idx}`,
          title: `Remote Item ${idx}`,
          properties: {datetime: `2023-05-0${idx}T00:00:00Z`, 'eo:cloud_cover': 7},
          bbox: [-1, -2, 1, 2],
          assets: {thumb: {href: 'thumb.png', title: 'Thumb'}},
          links: [],
        }),
      };
    });
    vi.stubGlobal('fetch', fetchMock);

    render(<LazyChildList lazyChildren={lazy(3)} batchSize={2} />);
    fireEvent.click(screen.getByRole('button', {name: 'Load 2 more'}));

    await waitFor(() => {
      expect(screen.getByText('Remote Item 0')).toBeInTheDocument();
    });
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(screen.getByText('Remote Item 1')).toBeInTheDocument();
    // Datetime appears (both in the card header and the properties table).
    expect(screen.getAllByText('2023-05-00T00:00:00Z').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Thumb')).toHaveLength(2);
    // One item remains → button now offers to load the last one.
    expect(screen.getByRole('button', {name: 'Load 1 more'})).toBeInTheDocument();
  });

  it('surfaces a fetch error without crashing', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => ({ok: false, status: 500, statusText: 'Server Error'})),
    );
    render(<LazyChildList lazyChildren={lazy(1)} batchSize={1} />);
    fireEvent.click(screen.getByRole('button', {name: 'Load 1 more'}));
    await waitFor(() => {
      expect(screen.getByText(/Could not load/)).toBeInTheDocument();
    });
  });
});

describe('KeyValueTable', () => {
  it('renders rows, skipping undefined values', () => {
    const {container} = render(
      <KeyValueTable
        caption="Meta"
        entries={[
          ['License', 'MIT'],
          ['Empty', undefined],
        ]}
      />,
    );
    expect(screen.getByText('Meta')).toBeInTheDocument();
    expect(within(container).getByText('License')).toBeInTheDocument();
    expect(screen.queryByText('Empty')).not.toBeInTheDocument();
  });

  it('returns null when every value is undefined', () => {
    const {container} = render(
      <KeyValueTable entries={[['a', undefined]]} />,
    );
    expect(container.querySelector('table')).toBeNull();
  });
});

describe('PropertiesTable', () => {
  it('renders registry-aware labels and formatted values', () => {
    render(
      <PropertiesTable
        caption="Props"
        properties={{'eo:cloud_cover': 4.2, platform: 'sentinel-2'}}
      />,
    );
    expect(screen.getByText('Cloud cover')).toBeInTheDocument();
    expect(screen.getByText('4.2 %')).toBeInTheDocument();
    expect(screen.getByText('Platform')).toBeInTheDocument();
  });

  it('returns null for empty properties', () => {
    const {container} = render(<PropertiesTable properties={{}} />);
    expect(container.querySelector('table')).toBeNull();
  });
});

describe('AssetList', () => {
  it('renders asset links, types and roles', () => {
    render(
      <AssetList
        assets={{
          thumb: {
            href: 'thumb.png',
            title: 'Thumb',
            type: 'image/png',
            roles: ['thumbnail'],
          },
          data: {href: 'data.tif'},
        }}
      />,
    );
    expect(screen.getByText('Thumb')).toBeInTheDocument();
    expect(screen.getByText('image/png')).toBeInTheDocument();
    expect(screen.getByText('thumbnail')).toBeInTheDocument();
    // Falls back to the asset key when no title is present.
    expect(screen.getByText('data')).toBeInTheDocument();
  });

  it('marks asset links as downloads and offers copy-link buttons', () => {
    render(
      <AssetList
        assets={{
          data: {href: 'https://cdn.test/scene/data.tif', title: 'Scene'},
        }}
      />,
    );
    // The link is presented as a download that opens in a new tab.
    const link = screen.getByRole('link', {name: /scene/i});
    expect(link).toHaveAttribute('href', 'https://cdn.test/scene/data.tif');
    expect(link).toHaveAttribute('target', '_blank');
    expect(link).toHaveAttribute('title', 'Download Scene');
    // File extension is surfaced.
    expect(screen.getByText('TIF')).toBeInTheDocument();
    // A copy-link button is present.
    expect(
      screen.getByRole('button', {name: /copy link to scene/i}),
    ).toBeInTheDocument();
  });

  it('copies a resolved link to the clipboard when the copy button is clicked', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.assign(navigator, {clipboard: {writeText}});
    render(
      <AssetList
        assets={{data: {href: 'https://cdn.test/scene/data.tif', title: 'Scene'}}}
      />,
    );
    fireEvent.click(screen.getByRole('button', {name: /copy link to scene/i}));
    await waitFor(() =>
      expect(writeText).toHaveBeenCalledWith('https://cdn.test/scene/data.tif'),
    );
  });

  it('returns null when there are no assets', () => {
    const {container} = render(<AssetList assets={undefined} />);
    expect(container.querySelector('.stac-assets')).toBeNull();
  });
});

describe('StacHead', () => {
  it('emits an alternate JSON link and JSON-LD script', () => {
    render(
      <StacHead
        jsonHref="https://cat.test/n.json"
        jsonLd={{'@type': 'Dataset', name: 'N'}}
      />,
    );
    const link = document.querySelector(
      'link[rel="alternate"][href="https://cat.test/n.json"]',
    );
    expect(link).toHaveAttribute('type', 'application/json');
    const script = document.querySelector(
      'script[type="application/ld+json"]',
    );
    expect(script?.textContent).toContain('"name":"N"');
  });

  it('renders nothing without a jsonHref', () => {
    const {container} = render(<StacHead jsonLd={{'@type': 'Dataset'}} />);
    expect(container.querySelector('link')).toBeNull();
    expect(container.querySelector('script')).toBeNull();
  });
});

describe('SourceJsonLink', () => {
  it('renders a download + copy control for the source JSON', () => {
    render(<SourceJsonLink jsonHref="https://cat.test/n.json" />);
    const link = screen.getByRole('link', {name: /view source json/i});
    expect(link).toHaveAttribute('href', 'https://cat.test/n.json');
    expect(link).toHaveAttribute('target', '_blank');
    expect(
      screen.getByRole('button', {name: /copy link to stac json/i}),
    ).toBeInTheDocument();
  });

  it('renders nothing without a jsonHref', () => {
    const {container} = render(<SourceJsonLink />);
    expect(container.querySelector('.stac-source-json')).toBeNull();
  });
});

describe('FootprintText', () => {
  it('renders a bbox table', () => {
    render(<FootprintText bbox={[-1, -2, 1, 2]} />);
    expect(screen.getByText('Bounding box')).toBeInTheDocument();
    expect(screen.getByText(/W -1, S -2, E 1, N 2/)).toBeInTheDocument();
  });

  it('renders an empty state without a bbox', () => {
    render(<FootprintText bbox={undefined} />);
    expect(
      screen.getByText('No spatial footprint available.'),
    ).toBeInTheDocument();
  });
});
