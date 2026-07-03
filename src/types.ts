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

/**
 * A reference to an Item that exists in the source catalog but was NOT
 * materialized into a static page (it fell past `maxItemsPerCollection`). It
 * carries only the fetchable href + any link title, so the client can lazily
 * load and render it on demand for human visitors. These are intentionally not
 * crawlable (no static route) — the static, capped set is what crawlers see.
 */
export interface StacLazyChildRef {
  /** Absolute http(s) URL the Item JSON can be fetched from in the browser. */
  href: string;
  /** Title from the source `item` link, if it provided one. */
  title?: string;
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
  /**
   * Items past `maxItemsPerCollection` that were deferred to lazy client-side
   * loading instead of getting their own static page. Empty for local catalogs
   * (whose Items are always materialized).
   */
  lazyChildren: StacLazyChildRef[];
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
   * Max number of `item`-linked children to materialize as static, crawlable
   * pages per parent catalog/collection. A practicality guardrail for API-scale
   * catalogs (e.g. Overture) that expose thousands of items as static files.
   * Child/subcatalog links are always followed.
   *
   * Defaults to `100`. Items beyond the cap on **remote** (`http(s)`) catalogs
   * are not fetched at build time (so builds stay bounded and crawlers see the
   * capped set); instead they are rendered as a lazy, client-side "load on
   * demand" list so human visitors can still browse them. Items in **local**
   * catalogs are always fully materialized (a browser can't fetch un-served
   * local files, and local reads are cheap). Set to `Infinity` to disable the
   * cap entirely, or `0` to make every Item lazy.
   */
  maxItemsPerCollection?: number;
  /** Map configuration, or `false` to disable maps. Defaults to enabled. */
  map?: StacMapOptions | false;
  /** Number of child records shown per page before pagination. Defaults to 25. */
  itemsPerPage?: number;
  /** Whether to build a client search box on the catalog root. Defaults to true. */
  search?: boolean;
  /**
   * Whether to render a persistent, collapsible catalog-tree sidebar on every
   * page. Defaults to true. Set to `false` for very large catalogs where the
   * full tree isn't a useful navigation aid.
   */
  sidebar?: boolean;
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
  sidebar: boolean;
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
  sidebarEnabled: boolean;
  /** Served path to this node's canonical STAC JSON (baseUrl-prefixed). */
  jsonHref?: string;
  /** schema.org `Dataset` JSON-LD describing this node, for agents/crawlers. */
  jsonLd?: Record<string, unknown>;
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
  sidebar: boolean;
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
