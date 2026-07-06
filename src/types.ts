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
  /**
   * True when this ref points at the generated `/latest` alias — a stable,
   * pinned URL that mirrors whichever dated release is currently newest (see
   * `StacNode.isLatestAlias`). Lets the UI mark it as a moving target rather
   * than a fixed, permanent page.
   */
  isLatestAlias?: boolean;
  /**
   * Best-effort thumbnail/preview image href for this child, resolved once at
   * build time via `findThumbnailHref` (see `thumbnail.ts`). Lets a child list
   * show a small image next to each entry — the same convention STAC Browser
   * uses — without every page having to re-derive it from the child's assets.
   */
  thumbnailHref?: string;
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
  /**
   * True for every node in a generated `/latest` alias subtree — a mirror of
   * whichever dated release is currently flagged `latest` in the source
   * catalog, exposed at a stable route so links to it don't need updating as
   * new releases replace the current one. Lets the UI mark these pages as a
   * moving target rather than a fixed, permanent release.
   */
  isLatestAlias?: boolean;
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
  /**
   * Optional content for a "looking for something that's gone?" hint that
   * this plugin composes into the site's 404 page (alongside, not instead of,
   * the theme's normal "Page Not Found" copy). This plugin has no built-in
   * opinions about *why* a page might be missing — a data-retention policy, a
   * moved catalog, whatever applies to your site — supply your own
   * title/description/links here. Omit entirely to leave the 404 page
   * untouched.
   */
  notFoundHint?: StacNotFoundHintOptions;
}

/** A single suggested link shown in the 404 hint (see `notFoundHint`). */
export interface StacNotFoundHintLink {
  /** Visible link text, e.g. "Data retention policy". */
  label: string;
  /**
   * Absolute (`https://...`) or site-relative (e.g. `/stac/latest`) URL.
   * Rendered via Docusaurus's `Link`, so relative paths get the site's
   * `baseUrl` prefixed automatically and absolute URLs pass through as
   * plain external links.
   */
  href: string;
}

/** Configurable content for the 404-page hint (see `StacPluginOptions.notFoundHint`). */
export interface StacNotFoundHintOptions {
  /**
   * Heading for the hint card. Defaults to a generic "looking for something
   * that used to be here?" message when omitted but `description`/`links`
   * are provided.
   */
  title?: string;
  /** Free-form explanation shown under the title. */
  description?: string;
  /** Suggested links, e.g. a retention policy or a stable "latest" URL. */
  links?: StacNotFoundHintLink[];
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
  notFoundHint?: StacNotFoundHintOptions;
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
  notFoundHint?: StacNotFoundHintOptions;
}

export interface StacNavNode {
  id: string;
  type: StacNodeType;
  title: string;
  routePath: string;
  children: StacNavNode[];
  /** See `StacNode.isLatestAlias`. */
  isLatestAlias?: boolean;
}
