import React from 'react';
import Link from '@docusaurus/Link';
import type {
  StacAsset,
  StacChildRef,
  StacNode,
} from '../../types.js';

// ---------------------------------------------------------------------------
// Formatting helpers
// ---------------------------------------------------------------------------

export function formatValue(value: unknown): string {
  if (value === null || value === undefined) return '—';
  if (typeof value === 'string') return value;
  if (typeof value === 'number' || typeof value === 'boolean') {
    return String(value);
  }
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}

/** Best-effort bbox `[west, south, east, north]` from a GeoJSON geometry. */
export function bboxFromGeometry(geometry: unknown): number[] | undefined {
  if (!geometry || typeof geometry !== 'object') return undefined;
  const coords = (geometry as {coordinates?: unknown}).coordinates;
  if (coords === undefined) return undefined;

  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

  const walk = (node: unknown): void => {
    if (!Array.isArray(node)) return;
    if (
      node.length >= 2 &&
      typeof node[0] === 'number' &&
      typeof node[1] === 'number'
    ) {
      const [x, y] = node as number[];
      if (x < minX) minX = x;
      if (y < minY) minY = y;
      if (x > maxX) maxX = x;
      if (y > maxY) maxY = y;
      return;
    }
    for (const child of node) walk(child);
  };

  walk(coords);
  if (!Number.isFinite(minX)) return undefined;
  return [minX, minY, maxX, maxY];
}

export function itemBbox(node: StacNode): number[] | undefined {
  const stac = node.stac as {bbox?: number[]; geometry?: unknown};
  if (Array.isArray(stac.bbox) && stac.bbox.length >= 4) {
    // STAC bbox may be 2D [w,s,e,n] or 3D [w,s,minz,e,n,maxz]; normalize to 2D.
    if (stac.bbox.length >= 6) {
      return [stac.bbox[0], stac.bbox[1], stac.bbox[3], stac.bbox[4]];
    }
    return stac.bbox.slice(0, 4);
  }
  return bboxFromGeometry(stac.geometry);
}

// ---------------------------------------------------------------------------
// Shared presentational components
// ---------------------------------------------------------------------------

const TYPE_BADGE: Record<StacNode['type'], string> = {
  Catalog: 'stac-badge--catalog',
  Collection: 'stac-badge--collection',
  Item: 'stac-badge--item',
};

export function TypeBadge({type}: {type: StacNode['type']}): React.JSX.Element {
  return <span className={`stac-badge ${TYPE_BADGE[type]}`}>{type}</span>;
}

export function Breadcrumbs({
  node,
  routeBasePath,
  rootTitle,
}: {
  node: StacNode;
  routeBasePath: string;
  rootTitle?: string;
}): React.JSX.Element {
  return (
    <nav className="stac-breadcrumbs" aria-label="Breadcrumb">
      <Link to={routeBasePath}>{rootTitle ?? 'Catalog'}</Link>
      {node.routePath !== routeBasePath && (
        <>
          <span className="stac-breadcrumbs__sep">/</span>
          <span className="stac-breadcrumbs__current">{node.title}</span>
        </>
      )}
    </nav>
  );
}

export function ChildList({
  children,
}: {
  children: StacChildRef[];
}): React.JSX.Element {
  if (children.length === 0) {
    return <p className="stac-empty">No child records.</p>;
  }
  return (
    <ul className="stac-child-list">
      {children.map((c) => (
        <li key={c.routePath} className="stac-child-list__item">
          <Link to={c.routePath} className="stac-child-list__link">
            <TypeBadge type={c.type} />
            <span className="stac-child-list__title">{c.title}</span>
          </Link>
        </li>
      ))}
    </ul>
  );
}

export function KeyValueTable({
  entries,
  caption,
}: {
  entries: [string, unknown][];
  caption?: string;
}): React.JSX.Element | null {
  const rows = entries.filter(([, v]) => v !== undefined);
  if (rows.length === 0) return null;
  return (
    <table className="stac-kv">
      {caption && <caption className="stac-kv__caption">{caption}</caption>}
      <tbody>
        {rows.map(([k, v]) => (
          <tr key={k}>
            <th scope="row" className="stac-kv__key">
              {k}
            </th>
            <td className="stac-kv__value">{formatValue(v)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

export function AssetList({
  assets,
}: {
  assets: Record<string, StacAsset> | undefined;
}): React.JSX.Element | null {
  const entries = Object.entries(assets ?? {});
  if (entries.length === 0) return null;
  return (
    <div className="stac-assets">
      <h2 className="stac-section-title">Assets</h2>
      <ul className="stac-assets__list">
        {entries.map(([key, asset]) => (
          <li key={key} className="stac-assets__item">
            <a href={asset.href} className="stac-assets__link">
              {asset.title ?? key}
            </a>
            {asset.type && (
              <span className="stac-assets__type">{asset.type}</span>
            )}
            {Array.isArray(asset.roles) && asset.roles.length > 0 && (
              <span className="stac-assets__roles">
                {asset.roles.join(', ')}
              </span>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}

/** Text-only footprint, used when the map is disabled or unavailable. */
export function FootprintText({
  bbox,
}: {
  bbox: number[] | undefined;
}): React.JSX.Element {
  if (!bbox) {
    return <p className="stac-empty">No spatial footprint available.</p>;
  }
  const [w, s, e, n] = bbox;
  return (
    <table className="stac-kv">
      <tbody>
        <tr>
          <th scope="row" className="stac-kv__key">
            Bounding box
          </th>
          <td className="stac-kv__value">
            W {w}, S {s}, E {e}, N {n}
          </td>
        </tr>
      </tbody>
    </table>
  );
}
