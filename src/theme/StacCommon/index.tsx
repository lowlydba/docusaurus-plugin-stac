import React, {useState} from 'react';
import Link from '@docusaurus/Link';
import Translate, {translate} from '@docusaurus/Translate';

import type {StacAsset, StacChildRef, StacNode} from '../../types.js';
import {formatFieldValue, getFieldLabel} from '../../fields/registry.js';

// ---------------------------------------------------------------------------
// Formatting helpers
// ---------------------------------------------------------------------------

export function formatValue(value: unknown): string {
  if (value === null || value === undefined) return '\u2014';
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
    <nav
      className="stac-breadcrumbs"
      aria-label={translate({
        id: 'stac.breadcrumbs.aria',
        message: 'Breadcrumb',
      })}
    >
      <Link to={routeBasePath}>
        {rootTitle ?? (
          <Translate id="stac.breadcrumbs.catalog" description="Root crumb">
            Catalog
          </Translate>
        )}
      </Link>
      {node.routePath !== routeBasePath && (
        <>
          <span className="stac-breadcrumbs__sep">/</span>
          <span className="stac-breadcrumbs__current">{node.title}</span>
        </>
      )}
    </nav>
  );
}

function ChildLink({child}: {child: StacChildRef}): React.JSX.Element {
  return (
    <Link to={child.routePath} className="stac-child-list__link">
      <TypeBadge type={child.type} />
      <span className="stac-child-list__title">{child.title}</span>
    </Link>
  );
}

/**
 * A crawlable, client-paginated list of child records. Every child is rendered
 * into the DOM (so crawlers see them all); pagination only toggles visibility.
 */
export function ChildList({
  children,
  itemsPerPage,
}: {
  children: StacChildRef[];
  itemsPerPage?: number;
}): React.JSX.Element {
  const [page, setPage] = useState(0);

  if (children.length === 0) {
    return (
      <p className="stac-empty">
        <Translate id="stac.childList.empty">No child records.</Translate>
      </p>
    );
  }

  const perPage = itemsPerPage && itemsPerPage > 0 ? itemsPerPage : children.length;
  const pageCount = Math.ceil(children.length / perPage);
  const start = page * perPage;
  const end = start + perPage;

  return (
    <div className="stac-child-list-wrap">
      <ul className="stac-child-list">
        {children.map((c, i) => (
          <li
            key={c.routePath}
            className="stac-child-list__item"
            hidden={pageCount > 1 && (i < start || i >= end)}
          >
            <ChildLink child={c} />
          </li>
        ))}
      </ul>
      {pageCount > 1 && (
        <div className="stac-pagination" role="navigation">
          <button
            type="button"
            className="stac-pagination__btn"
            disabled={page === 0}
            onClick={() => setPage((p) => Math.max(0, p - 1))}
          >
            <Translate id="stac.pagination.prev">Previous</Translate>
          </button>
          <span className="stac-pagination__status">
            <Translate
              id="stac.pagination.status"
              values={{current: page + 1, total: pageCount}}
            >
              {'Page {current} of {total}'}
            </Translate>
          </span>
          <button
            type="button"
            className="stac-pagination__btn"
            disabled={page >= pageCount - 1}
            onClick={() => setPage((p) => Math.min(pageCount - 1, p + 1))}
          >
            <Translate id="stac.pagination.next">Next</Translate>
          </button>
        </div>
      )}
    </div>
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

/**
 * Like KeyValueTable, but resolves labels and value formatting through the
 * extension-aware field registry (stac-fields-lite).
 */
export function PropertiesTable({
  properties,
  caption,
}: {
  properties: Record<string, unknown>;
  caption?: string;
}): React.JSX.Element | null {
  const keys = Object.keys(properties);
  if (keys.length === 0) return null;
  return (
    <table className="stac-kv">
      {caption && <caption className="stac-kv__caption">{caption}</caption>}
      <tbody>
        {keys.map((key) => (
          <tr key={key}>
            <th scope="row" className="stac-kv__key" title={key}>
              {getFieldLabel(key)}
            </th>
            <td className="stac-kv__value">
              {formatFieldValue(key, properties[key])}
            </td>
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
      <h2 className="stac-section-title">
        <Translate id="stac.assets.title">Assets</Translate>
      </h2>
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
    return (
      <p className="stac-empty">
        <Translate id="stac.footprint.none">
          No spatial footprint available.
        </Translate>
      </p>
    );
  }
  const [w, s, e, n] = bbox;
  return (
    <table className="stac-kv">
      <tbody>
        <tr>
          <th scope="row" className="stac-kv__key">
            <Translate id="stac.footprint.bbox">Bounding box</Translate>
          </th>
          <td className="stac-kv__value">
            W {w}, S {s}, E {e}, N {n}
          </td>
        </tr>
      </tbody>
    </table>
  );
}
