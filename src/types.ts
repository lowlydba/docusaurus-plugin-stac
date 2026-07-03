/**
 * Type definitions for docusaurus-plugin-stac.
 *
 * These cover the subset of the STAC spec the plugin needs (Catalog / Collection
 * / Item and the link/asset structures), the plugin options, and the internal
 * node model that the walker produces and the theme components consume.
 */

// ---------------------------------------------------------------------------
// STAC spec types (minimal, tolerant subset)
// ---------------------------------------------------------------------------

export interface StacLink {
  rel: string;
  href: string;
  type?: string;
  title?: string;
  [key: string]: unknown;
}

export interface StacAsset {
  href: string;
  title?: string;
  description?: string;
  type?: string;
  roles?: string[];
  [key: string]: unknown;
}

export interface StacProvider {
  name: string;
  description?: string;
  roles?: string[];
  url?: string;
}

export interface StacExtent {
  spatial?: {bbox: number[][]};
  temporal?: {interval: (string | null)[][]};
}

/** A GeoJSON-ish geometry; we keep it loose since we only pass it through. */
export interface StacGeometry {
  type: string;
  coordinates: unknown;
}

/** Common fields shared across Catalog / Collection / Item. */
export interface StacObjectBase {
  type?: string;
  stac_version?: string;
  stac_extensions?: string[];
  id: string;
  title?: string;
  description?: string;
  links: StacLink[];
  [key: string]: unknown;
}

export interface StacCatalog extends StacObjectBase {
  type?: 'Catalog';
}

export interface StacCollection extends StacObjectBase {
  type?: 'Collection';
  license?: string;
  extent?: StacExtent;
  providers?: StacProvider[];
  keywords?: string[];
  summaries?: Record<string, unknown>;
  assets?: Record<string, StacAsset>;
}

export interface StacItem extends StacObjectBase {
  type?: 'Feature';
  collection?: string;
  bbox?: number[];
  geometry?: StacGeometry | null;
  properties: Record<string, unknown> & {datetime?: string | null};
  assets: Record<string, StacAsset>;
}

export type StacObject = StacCatalog | StacCollection | StacItem;

export type StacNodeType = 'Catalog' | 'Collection' | 'Item';

// ---------------------------------------------------------------------------
// Internal node model (produced by the walker, serialized into route data)
// ---------------------------------------------------------------------------

/** A lightweight reference to a child node, used to render link lists. */
export interface StacChildRef {
  id: string;
  type: StacNodeType;
  title: string;
  routePath: string;
}

export interface StacNode {
  /** STAC id. */
  id: string;
  /** Resolved node type. */
  type: StacNodeType;
  /** Human-facing title (falls back to id). */
  title: string;
  /** Route path this node is served at, e.g. `/stac/collection-a/item-1`. */
  routePath: string;
  /** Absolute-ish source href the node was loaded from (for provenance). */
  sourceHref: string;
  /** Parent route path, if any. */
  parentRoutePath?: string;
  /** Depth from the root catalog (root = 0). */
  depth: number;
  /** Child catalogs/collections/items, in encounter order. */
  children: StacChildRef[];
  /** The raw STAC object (links rewritten to internal routes where resolved). */
  stac: StacObject;
}

/** The tree emitted by `loadContent`. */
export interface StacContent {
  root: StacNode;
  /** All nodes keyed by routePath, flattened for convenience. */
  nodes: StacNode[];
}

// ---------------------------------------------------------------------------
// Plugin options
// ---------------------------------------------------------------------------

/**
 * Map / basemap configuration. Set `map: false` to disable the interactive map
 * entirely (Item pages then render a text-only footprint fallback). Otherwise
 * provide an object to configure the MapLibre + PMTiles basemap.
 */
export interface StacMapOptions {
  /** Master toggle. Defaults to `true` when a map object is supplied. */
  enabled?: boolean;
  /**
   * URL to an Overture (or other) PMTiles archive, read directly in the browser
   * via HTTP range requests. When omitted, the map falls back to `style` (if
   * given) or a plain no-tiles background, still drawing the footprint.
   */
  pmtilesUrl?: string;
  /**
   * A MapLibre style URL or inline style object. Takes precedence over the
   * built-in PMTiles style when provided.
   */
  style?: string | Record<string, unknown>;
  /** The source-layer name for the footprint context (unused unless styling). */
  attribution?: string;
  /** Initial map height in CSS pixels. Defaults to 360. */
  height?: number;
  /** Hex/CSS color for the footprint outline. Defaults to `#e0114a`. */
  footprintColor?: string;
}

export interface StacPluginOptions {
  /**
   * Path or URL to the root STAC catalog/collection JSON. Local paths are
   * resolved relative to the site directory; `http(s)://` URLs are fetched.
   */
  path: string;
  /** Base route all generated pages live under. Defaults to `/stac`. */
  routeBasePath?: string;
  /** Optional unique id (Docusaurus multi-instance support). */
  id?: string;
  /** Page/nav title for the catalog root. Defaults to the catalog's title/id. */
  title?: string;
  /** Max depth to walk from the root (root = 0). Defaults to Infinity. */
  maxDepth?: number;
  /**
   * Max number of `item`-linked children to materialize per parent
   * catalog/collection. A practicality guardrail for API-scale catalogs (e.g.
   * Overture) that expose thousands of items as static files; child/subcatalog
   * links are always followed. Defaults to Infinity (spec-faithful: a page per
   * Item). Catalog/Collection pages still paginate their full listing.
   */
  maxItemsPerCollection?: number;
  /** Map configuration, or `false` to disable maps. Defaults to enabled. */
  map?: StacMapOptions | false;
  /** Number of child records shown per page before pagination. Defaults to 25. */
  itemsPerPage?: number;
  /** Whether to build a client search box on the catalog root. Defaults to true. */
  search?: boolean;
}

/** Options after defaults are applied. */
export interface NormalizedStacMapOptions {
  enabled: boolean;
  pmtilesUrl?: string;
  style?: string | Record<string, unknown>;
  attribution?: string;
  height: number;
  footprintColor: string;
}

export interface NormalizedStacPluginOptions {
  path: string;
  routeBasePath: string;
  id: string;
  title?: string;
  maxDepth: number;
  maxItemsPerCollection: number;
  map: NormalizedStacMapOptions;
  itemsPerPage: number;
  search: boolean;
}

// ---------------------------------------------------------------------------
// Props passed to theme components via route `modules`
// ---------------------------------------------------------------------------

export interface StacPageData {
  node: StacNode;
  routeBasePath: string;
  map: NormalizedStacMapOptions;
  itemsPerPage: number;
  searchEnabled: boolean;
}

/** A flattened entry used by the client search component. */
export interface StacSearchEntry {
  id: string;
  type: StacNodeType;
  title: string;
  routePath: string;
  description?: string;
  keywords?: string[];
  datetime?: string;
}

/** Global plugin data exposed via `usePluginData`. */
export interface StacGlobalData {
  routeBasePath: string;
  title: string;
  map: NormalizedStacMapOptions;
  itemsPerPage: number;
  search: boolean;
  tree: StacNavNode;
  index: StacSearchEntry[];
}

export interface StacNavNode {
  id: string;
  type: StacNodeType;
  title: string;
  routePath: string;
  children: StacNavNode[];
}
