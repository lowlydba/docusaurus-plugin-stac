import {describe, it, expect} from 'vitest';
import {render, screen, fireEvent, within} from '@testing-library/react';
import React from 'react';

import {
  formatValue,
  bboxFromGeometry,
  itemBbox,
  TypeBadge,
  Breadcrumbs,
  ChildList,
  KeyValueTable,
  PropertiesTable,
  AssetList,
  FootprintText,
} from '../../src/theme/StacCommon/index.js';
import type {StacChildRef, StacNode} from '../../src/types.js';

function node(stac: Record<string, unknown>, extra: Partial<StacNode> = {}): StacNode {
  return {
    id: 'n',
    type: 'Item',
    title: 'Node',
    routePath: '/stac/n',
    sourceHref: '/stac/n',
    depth: 1,
    children: [],
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

  it('returns null when there are no assets', () => {
    const {container} = render(<AssetList assets={undefined} />);
    expect(container.querySelector('.stac-assets')).toBeNull();
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
