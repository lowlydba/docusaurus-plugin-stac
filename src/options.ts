import type {
  NormalizedStacMapOptions,
  NormalizedStacPluginOptions,
  StacNotFoundHintOptions,
  StacPluginOptions,
} from './types.js';

export const DEFAULT_ROUTE_BASE = '/stac';
export const DEFAULT_MAP_HEIGHT = 360;
export const DEFAULT_FOOTPRINT_COLOR = '#e0114a';
export const DEFAULT_ITEMS_PER_PAGE = 25;
export const DEFAULT_MAX_ITEMS_PER_COLLECTION = 100;

export function normalizeRouteBase(routeBasePath: string): string {
  let base = routeBasePath.trim();
  if (!base.startsWith('/')) base = `/${base}`;
  if (base.length > 1 && base.endsWith('/')) base = base.replace(/\/+$/, '');
  return base;
}

export function normalizeMap(
  map: StacPluginOptions['map'],
): NormalizedStacMapOptions {
  if (map === false) {
    return {
      enabled: false,
      height: DEFAULT_MAP_HEIGHT,
      footprintColor: DEFAULT_FOOTPRINT_COLOR,
    };
  }
  const m = map ?? {};
  return {
    enabled: m.enabled ?? true,
    pmtilesUrl: m.pmtilesUrl,
    style: m.style,
    attribution: m.attribution,
    height: m.height ?? DEFAULT_MAP_HEIGHT,
    footprintColor: m.footprintColor ?? DEFAULT_FOOTPRINT_COLOR,
  };
}

/**
 * Drops malformed link entries (missing a `label` or `href`) rather than
 * letting them reach the client, and collapses an all-empty hint down to
 * `undefined` so downstream code can use a single truthy check to decide
 * whether there's anything to render.
 */
export function normalizeNotFoundHint(
  hint: StacPluginOptions['notFoundHint'],
): StacNotFoundHintOptions | undefined {
  if (!hint) return undefined;
  const links = (hint.links ?? []).filter(
    (link) => typeof link?.label === 'string' && typeof link?.href === 'string',
  );
  if (!hint.title && !hint.description && links.length === 0) return undefined;
  return {
    title: hint.title,
    description: hint.description,
    ...(links.length > 0 ? {links} : {}),
  };
}

export function normalizeOptions(
  options: StacPluginOptions,
): NormalizedStacPluginOptions {
  if (!options || !options.path) {
    throw new Error(
      'docusaurus-plugin-stac: the `path` option (root STAC catalog path or URL) is required.',
    );
  }
  const itemsPerPage =
    typeof options.itemsPerPage === 'number' && options.itemsPerPage > 0
      ? Math.floor(options.itemsPerPage)
      : DEFAULT_ITEMS_PER_PAGE;

  return {
    path: options.path,
    routeBasePath: normalizeRouteBase(options.routeBasePath ?? DEFAULT_ROUTE_BASE),
    id: options.id ?? 'default',
    title: options.title,
    maxDepth: options.maxDepth ?? Number.POSITIVE_INFINITY,
    maxItemsPerCollection:
      typeof options.maxItemsPerCollection === 'number' &&
      options.maxItemsPerCollection >= 0
        ? Math.floor(options.maxItemsPerCollection)
        : DEFAULT_MAX_ITEMS_PER_COLLECTION,
    map: normalizeMap(options.map),
    itemsPerPage,
    search: options.search ?? true,
    sidebar: options.sidebar ?? true,
    notFoundHint: normalizeNotFoundHint(options.notFoundHint),
  };
}
