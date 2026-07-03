import React, {useState} from 'react';
import Head from '@docusaurus/Head';
import Link from '@docusaurus/Link';
import Translate, {translate} from '@docusaurus/Translate';

import type {
  StacAsset,
  StacChildRef,
  StacItem,
  StacLazyChildRef,
  StacNode,
  StacObject,
} from '../../types.js';
import {
  formatFieldValue,
  getFieldLabel,
  hasFieldFormatter,
} from '../../fields/registry.js';
import {JsonBlock} from './JsonBlock.js';
import {CopyLinkButton, CopyTextButton} from './CopyButton.js';
import {StorageSchemesValue, detectStorageProvider} from './StorageSchemes.js';
import {ProviderIcon} from './ProviderIcons.js';
import {isPlainObject} from '../../utils.js';

export {CopyLinkButton} from './CopyButton.js';

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

/** True for a non-null, non-array object — a nested structure best shown as JSON. */
const isNestedObject = isPlainObject;

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
  return stacBbox(node.stac);
}

/** Best-effort `[west, south, east, north]` from a raw STAC object. */
export function stacBbox(stac: unknown): number[] | undefined {
  const s = stac as {bbox?: number[]; geometry?: unknown};
  if (Array.isArray(s.bbox) && s.bbox.length >= 4) {
    if (s.bbox.length >= 6) {
      return [s.bbox[0], s.bbox[1], s.bbox[3], s.bbox[4]];
    }
    return s.bbox.slice(0, 4);
  }
  return bboxFromGeometry(s.geometry);
}

/** `[west, south, east, north]` as a GeoJSON/STAC-style bbox array literal —
 * the format most useful for pasting back into JSON or a script. */
export function bboxToGeoJson(bbox: number[]): string {
  return `[${bbox.join(', ')}]`;
}

/** `[west, south, east, north]` as a comma-separated string — the format
 * STAC/OGC API `bbox` query parameters expect. */
export function bboxToApiParam(bbox: number[]): string {
  return bbox.join(',');
}

/** `[west, south, east, north]` as a WKT POLYGON, for pasting into GIS tools
 * (QGIS, PostGIS, Shapely, etc.) that don't accept a bbox directly. */
export function bboxToWkt(bbox: number[]): string {
  const [w, s, e, n] = bbox;
  const ring = [
    [w, s],
    [e, s],
    [e, n],
    [w, n],
    [w, s],
  ]
    .map(([x, y]) => `${x} ${y}`)
    .join(', ');
  return `POLYGON((${ring}))`;
}

/** Last path segment of an href, ignoring query/fragment. */
function assetFileName(href: string): string {
  try {
    const {pathname} = new URL(href, 'https://placeholder.invalid/');
    return pathname.split('/').filter(Boolean).pop() ?? href;
  } catch {
    return href.split(/[?#]/)[0].split('/').filter(Boolean).pop() ?? href;
  }
}

/** Short uppercase file extension (e.g. `TIF`) for a download href, if any. */
function assetExtension(href: string): string | undefined {
  const name = assetFileName(href);
  const dot = name.lastIndexOf('.');
  if (dot > 0 && dot < name.length - 1) {
    const ext = name.slice(dot + 1);
    if (/^[A-Za-z0-9]{1,8}$/.test(ext)) return ext.toUpperCase();
  }
  return undefined;
}

// ---------------------------------------------------------------------------
// Shared presentational components
// ---------------------------------------------------------------------------

function DownloadIcon({className}: {className?: string}): React.JSX.Element {
  return (
    <svg
      className={className}
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      <path d="M12 3v12" />
      <path d="m7 12 5 5 5-5" />
      <path d="M5 21h14" />
    </svg>
  );
}

/**
 * A link that makes it visually explicit it points at a downloadable file: it
 * carries a download icon and opens in a new tab. Used for STAC assets and the
 * raw source-JSON links.
 */
export function DownloadLink({
  href,
  label,
  className,
  children,
}: {
  href: string;
  label: string;
  className?: string;
  children: React.ReactNode;
}): React.JSX.Element {
  return (
    <a
      href={href}
      className={`stac-download__link${className ? ` ${className}` : ''}`}
      target="_blank"
      rel="noopener noreferrer"
      title={label}
    >
      <DownloadIcon className="stac-download__icon" />
      {children}
    </a>
  );
}

const TYPE_BADGE: Record<StacNode['type'], string> = {
  Catalog: 'stac-badge--catalog',
  Collection: 'stac-badge--collection',
  Item: 'stac-badge--item',
};

/**
 * Emits per-page machine-readable discovery metadata: an `alternate` link to the
 * canonical STAC JSON and a schema.org `Dataset` JSON-LD block. Agents and search
 * engines discover via the HTML page and can then consume the linked JSON.
 */
export function StacHead({
  jsonHref,
  jsonLd,
}: {
  jsonHref?: string;
  jsonLd?: Record<string, unknown>;
}): React.JSX.Element | null {
  if (!jsonHref) return null;
  return (
    <Head>
      <link rel="alternate" type="application/json" href={jsonHref} />
      {jsonLd && (
        <script type="application/ld+json">{JSON.stringify(jsonLd)}</script>
      )}
    </Head>
  );
}

/**
 * A visible link to the page's canonical STAC JSON, with the same download +
 * copy affordance used for assets, so humans and agents can grab the raw record.
 */
export function SourceJsonLink({
  jsonHref,
}: {
  jsonHref?: string;
}): React.JSX.Element | null {
  if (!jsonHref) return null;
  return (
    <p className="stac-source-json stac-download">
      <DownloadLink
        href={jsonHref}
        label={translate({
          id: 'stac.sourceJson.download',
          message: 'Download this record as STAC JSON',
        })}
      >
        <Translate id="stac.sourceJson.view">View source JSON</Translate>
      </DownloadLink>
      <CopyLinkButton
        href={jsonHref}
        label={translate({
          id: 'stac.sourceJson.copy',
          message: 'Copy link to STAC JSON',
        })}
      />
    </p>
  );
}


export function TypeBadge({type}: {type: StacNode['type']}): React.JSX.Element {
  return <span className={`stac-badge ${TYPE_BADGE[type]}`}>{type}</span>;
}

/**
 * Marks a page (or Contents/tree entry) as a moving alias — e.g. the `/latest`
 * mirror of whichever dated release currently holds that title — rather than
 * a fixed, permanent record. Distinct from `TypeBadge`, which conveys the
 * STAC object kind, not its stability.
 */
export function LatestAliasPill(): React.JSX.Element {
  return (
    <span
      className="stac-pill stac-pill--moving"
      title={translate({
        id: 'stac.latestAlias.tooltip',
        message: 'Always points to the current release — not a fixed page.',
      })}
    >
      <Translate id="stac.latestAlias.pill">Moving tag</Translate>
    </span>
  );
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
      {child.isLatestAlias && <LatestAliasPill />}
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

/**
 * A client-only "load on demand" list for Items that were not materialized into
 * static pages (they fell past `maxItemsPerCollection`). These are intentionally
 * not crawlable — they're fetched in the browser when a human asks for them, so
 * large/API-scale catalogs stay browsable without exploding the static build.
 */
export function LazyChildList({
  lazyChildren,
  batchSize,
}: {
  lazyChildren: StacLazyChildRef[];
  batchSize?: number;
}): React.JSX.Element | null {
  const perBatch = batchSize && batchSize > 0 ? batchSize : 25;
  const [visible, setVisible] = useState(0);
  const [results, setResults] = useState<Record<number, LazyState>>({});

  if (!lazyChildren || lazyChildren.length === 0) return null;

  const loadRange = (from: number, to: number): void => {
    for (let i = from; i < to; i++) {
      setResults((r) => ({...r, [i]: {status: 'loading'}}));
      const {href} = lazyChildren[i];
      fetch(href)
        .then((res) => {
          if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
          return res.json();
        })
        .then((stac: StacObject) =>
          setResults((r) => ({...r, [i]: {status: 'loaded', stac}})),
        )
        .catch((err: unknown) =>
          setResults((r) => ({
            ...r,
            [i]: {status: 'error', message: (err as Error)?.message ?? String(err)},
          })),
        );
    }
  };

  const loadMore = (): void => {
    const next = Math.min(visible + perBatch, lazyChildren.length);
    loadRange(visible, next);
    setVisible(next);
  };

  const remaining = lazyChildren.length - visible;

  return (
    <div className="stac-lazy">
      <p className="stac-lazy__note">
        <Translate
          id="stac.lazy.note"
          values={{count: lazyChildren.length}}
          description="Explains the on-demand item list"
        >
          {
            '{count} additional item(s) are loaded on demand and are not indexed by search engines.'
          }
        </Translate>
      </p>
      {visible > 0 && (
        <ul className="stac-lazy__list">
          {lazyChildren.slice(0, visible).map((child, i) => (
            <li key={child.href} className="stac-lazy__item">
              <LazyItemCard child={child} state={results[i]} />
            </li>
          ))}
        </ul>
      )}
      {remaining > 0 && (
        <button
          type="button"
          className="stac-lazy__more button button--secondary"
          onClick={loadMore}
        >
          <Translate
            id="stac.lazy.loadMore"
            values={{count: Math.min(perBatch, remaining)}}
          >
            {'Load {count} more'}
          </Translate>
        </button>
      )}
    </div>
  );
}

type LazyState =
  | {status: 'loading'}
  | {status: 'error'; message: string}
  | {status: 'loaded'; stac: StacObject};

/** The "Source JSON" download + copy-link pair shown on every lazy item card. */
function LazyCardSourceJson({href}: {href: string}): React.JSX.Element {
  return (
    <span className="stac-download stac-download--inline">
      <DownloadLink
        href={href}
        className="stac-lazy__card-source"
        label={translate({
          id: 'stac.lazy.sourceDownload',
          message: 'Download source JSON',
        })}
      >
        <Translate id="stac.lazy.source">Source JSON</Translate>
      </DownloadLink>
      <CopyLinkButton
        href={href}
        label={translate({
          id: 'stac.lazy.sourceCopy',
          message: 'Copy link to source JSON',
        })}
      />
    </span>
  );
}

function LazyItemCard({
  child,
  state,
}: {
  child: StacLazyChildRef;
  state: LazyState | undefined;
}): React.JSX.Element {
  const fallbackTitle =
    child.title ?? child.href.split('/').pop() ?? child.href;

  if (!state || state.status === 'loading') {
    return (
      <div className="stac-lazy__card stac-lazy__card--loading">
        <span className="stac-lazy__card-title">{fallbackTitle}</span>{' '}
        <Translate id="stac.lazy.loading">Loading…</Translate>
      </div>
    );
  }

  if (state.status === 'error') {
    return (
      <div className="stac-lazy__card stac-lazy__card--error">
        <span className="stac-lazy__card-title">{fallbackTitle}</span>
        <span className="stac-lazy__card-error">
          <Translate id="stac.lazy.error" values={{message: state.message}}>
            {'Could not load: {message}'}
          </Translate>
        </span>{' '}
        <LazyCardSourceJson href={child.href} />
      </div>
    );
  }

  const stac = state.stac as StacItem;
  const title =
    (typeof stac.title === 'string' && stac.title) || stac.id || fallbackTitle;
  const properties =
    stac.properties && typeof stac.properties === 'object'
      ? stac.properties
      : {};
  const datetime =
    typeof properties.datetime === 'string' ? properties.datetime : undefined;

  return (
    <div className="stac-lazy__card">
      <div className="stac-lazy__card-head">
        <TypeBadge type="Item" />
        <span className="stac-lazy__card-title">{title}</span>
        {stac.id !== title && <code className="stac-id">{stac.id}</code>}
      </div>
      {datetime && (
        <p className="stac-lazy__card-datetime">{datetime}</p>
      )}
      <PropertiesTable properties={properties} />
      <AssetList assets={stac.assets} />
      <FootprintText bbox={stacBbox(stac)} />
      <LazyCardSourceJson href={child.href} />
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
            <td className="stac-kv__value">
              {isNestedObject(v) ? <JsonBlock value={v} /> : formatValue(v)}
            </td>
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
              {key === 'storage:schemes' && isNestedObject(properties[key]) ? (
                <StorageSchemesValue
                  value={properties[key] as Record<string, unknown>}
                />
              ) : isNestedObject(properties[key]) && !hasFieldFormatter(key) ? (
                <JsonBlock value={properties[key]} />
              ) : (
                formatFieldValue(key, properties[key])
              )}
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
        {entries.map(([key, asset]) => {
          const name = asset.title ?? key;
          const ext = assetExtension(asset.href);
          const provider = detectStorageProvider(key, {}, asset.href);
          const hasMeta =
            Boolean(asset.type) ||
            (Array.isArray(asset.roles) && asset.roles.length > 0);
          return (
            <li key={key} className="stac-assets__item">
              <div className="stac-download">
                {provider !== 'generic' && <ProviderIcon provider={provider} />}
                <DownloadLink
                  href={asset.href}
                  className="stac-assets__link"
                  label={translate(
                    {
                      id: 'stac.assets.download',
                      message: 'Download {name}',
                      description: 'Tooltip/label for a downloadable asset link',
                    },
                    {name},
                  )}
                >
                  <span className="stac-download__name">{name}</span>
                  {ext && <span className="stac-download__ext">{ext}</span>}
                </DownloadLink>
                <CopyLinkButton
                  href={asset.href}
                  label={translate(
                    {
                      id: 'stac.assets.copy',
                      message: 'Copy link to {name}',
                      description: 'Label for the copy-link button on an asset',
                    },
                    {name},
                  )}
                />
              </div>
              {hasMeta && (
                <div className="stac-assets__meta">
                  {asset.type && (
                    <span className="stac-assets__type">{asset.type}</span>
                  )}
                  {Array.isArray(asset.roles) && asset.roles.length > 0 && (
                    <span className="stac-assets__roles">
                      {asset.roles.join(', ')}
                    </span>
                  )}
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}

/** Text-only footprint, showing the bbox and copyable formats for GIS/API
 * use. Always rendered below the map (in addition to the map itself), and
 * used alone when the map is disabled or unavailable. */
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
    <div className="stac-bbox">
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
      <div className="stac-bbox__copy">
        <CopyTextButton
          text={bboxToGeoJson(bbox)}
          label={translate({
            id: 'stac.footprint.copyGeoJson',
            message: 'Copy bounding box as a GeoJSON/STAC array',
          })}
          actionLabel="GeoJSON"
        />
        <CopyTextButton
          text={bboxToApiParam(bbox)}
          label={translate({
            id: 'stac.footprint.copyApiParam',
            message: 'Copy bounding box as a STAC/OGC API bbox parameter',
          })}
          actionLabel="API param"
        />
        <CopyTextButton
          text={bboxToWkt(bbox)}
          label={translate({
            id: 'stac.footprint.copyWkt',
            message: 'Copy bounding box as WKT',
          })}
          actionLabel="WKT"
        />
      </div>
    </div>
  );
}
