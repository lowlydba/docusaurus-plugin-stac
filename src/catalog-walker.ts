import {promises as fs} from 'node:fs';
import path from 'node:path';
import {pathToFileURL} from 'node:url';

import type {
  StacChildRef,
  StacContent,
  StacLazyChildRef,
  StacNode,
  StacNodeType,
  StacObject,
} from './types.js';
import {normalizeStacObject} from './stac-normalize.js';

const CHILD_RELS = new Set(['child']);
const ITEM_RELS = new Set(['item']);

function isHttp(href: string): boolean {
  return /^https?:\/\//i.test(href);
}

/** Read + parse a STAC object from a local path or http(s) URL. */
async function loadStac(source: string): Promise<StacObject> {
  let text: string;
  if (isHttp(source)) {
    const res = await fetchWithRetry(source);
    if (!res.ok) {
      throw new Error(
        `docusaurus-plugin-stac: failed to fetch ${source} (${res.status} ${res.statusText})`,
      );
    }
    text = await res.text();
  } else {
    text = await fs.readFile(source, 'utf-8');
  }
  try {
    return JSON.parse(text) as StacObject;
  } catch (err) {
    throw new Error(
      `docusaurus-plugin-stac: ${source} is not valid JSON: ${
        (err as Error).message
      }`,
    );
  }
}

/**
 * Fetch with a request timeout and a couple of retries. Static catalogs are
 * often served from object storage or a live host (e.g. Overture); transient
 * network hiccups shouldn't fail a whole build. Only network errors/timeouts
 * are retried — a definitive HTTP response (including 4xx/5xx) is returned as-is
 * for the caller to handle.
 */
async function fetchWithRetry(
  url: string,
  attempts = 3,
  timeoutMs = 20000,
): Promise<Response> {
  let lastErr: unknown;
  for (let attempt = 0; attempt < attempts; attempt++) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      return await fetch(url, {signal: controller.signal});
    } catch (err) {
      lastErr = err;
      if (attempt < attempts - 1) {
        await new Promise((r) => setTimeout(r, 500 * (attempt + 1)));
      }
    } finally {
      clearTimeout(timer);
    }
  }
  throw new Error(
    `docusaurus-plugin-stac: network error fetching ${url}: ${
      (lastErr as Error)?.message ?? String(lastErr)
    }`,
  );
}

/**
 * Resolve a (possibly relative) link href against the location of the document
 * that contained it. Works for both filesystem paths and http(s) URLs.
 */
export function resolveHref(base: string, href: string): string {
  if (isHttp(href)) {
    return href;
  }
  if (isHttp(base)) {
    return new URL(href, base).toString();
  }
  // Absolute filesystem path.
  if (path.isAbsolute(href)) {
    return path.normalize(href);
  }
  return path.resolve(path.dirname(base), href);
}

/** Turn a STAC id into a URL-safe route segment. */
export function slugify(value: string): string {
  const slug = value
    .toString()
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return slug || 'item';
}

function detectType(
  stac: StacObject,
  relHint?: 'child' | 'item',
): StacNodeType {
  const t = (stac.type ?? '').toString().toLowerCase();
  if (t === 'collection') return 'Collection';
  if (t === 'feature') return 'Item';
  if (t === 'catalog') return 'Catalog';
  // Fall back to the link rel that led us here.
  if (relHint === 'item') return 'Item';
  // Heuristics for pre-1.0 objects that lack a `type` field: a Collection is
  // distinguished by extent/license/providers.
  const s = stac as {extent?: unknown; license?: unknown; providers?: unknown};
  if (s.extent || s.license || s.providers) return 'Collection';
  // A "child" with no type and no collection markers is treated as a Catalog.
  return 'Catalog';
}

function nodeTitle(stac: StacObject): string {
  return (
    (typeof stac.title === 'string' && stac.title) ||
    (typeof stac.id === 'string' && stac.id) ||
    'Untitled'
  );
}

interface WalkOptions {
  routeBasePath: string;
  maxDepth: number;
  maxItemsPerCollection?: number;
  /**
   * Optional progress hook, invoked once per node as the catalog is crawled.
   * Used by the plugin to surface build progress for large/remote catalogs
   * (where the crawl can otherwise run silently for minutes). Kept as a
   * caller-supplied callback so the walker itself stays pure and quiet in tests.
   */
  onNode?: (info: {count: number; type: StacNodeType; remote: boolean}) => void;
}

/**
 * Walk a static STAC catalog starting at `rootSource`, following `child` and
 * `item` links, and produce a flattened, route-assigned node tree.
 */
export async function walkCatalog(
  rootSource: string,
  {routeBasePath, maxDepth, maxItemsPerCollection, onNode}: WalkOptions,
): Promise<StacContent> {
  const itemCap = maxItemsPerCollection ?? Number.POSITIVE_INFINITY;
  const nodes: StacNode[] = [];
  const visited = new Set<string>();
  const usedRoutePaths = new Set<string>();

  function normalizeSourceKey(source: string): string {
    return isHttp(source) ? source : pathToFileURL(source).toString();
  }

  function assignRoutePath(parentPath: string, id: string): string {
    const base = `${parentPath}/${slugify(id)}`.replace(/\/{2,}/g, '/');
    let candidate = base;
    let i = 2;
    while (usedRoutePaths.has(candidate)) {
      candidate = `${base}-${i++}`;
    }
    usedRoutePaths.add(candidate);
    return candidate;
  }

  async function visit(
    source: string,
    parentRoutePath: string | undefined,
    depth: number,
    relHint: 'child' | 'item' | undefined,
    forcedRoutePath?: string,
  ): Promise<StacNode | undefined> {
    const key = normalizeSourceKey(source);
    if (visited.has(key)) {
      return undefined;
    }
    visited.add(key);

    const rawStac = await loadStac(source);
    const type = detectType(rawStac, relHint);
    const stac = normalizeStacObject(rawStac, type);
    const routePath =
      forcedRoutePath ?? assignRoutePath(parentRoutePath ?? routeBasePath, stac.id);

    const node: StacNode = {
      id: stac.id,
      type,
      title: nodeTitle(stac),
      routePath,
      sourceHref: source,
      parentRoutePath,
      depth,
      children: [],
      lazyChildren: [],
      stac,
    };
    nodes.push(node);
    onNode?.({count: nodes.length, type, remote: isHttp(source)});

    if (depth >= maxDepth) {
      return node;
    }

    const links = Array.isArray(stac.links) ? stac.links : [];
    let itemCount = 0;
    for (const link of links) {
      if (!link || typeof link.href !== 'string') continue;
      const rel = (link.rel ?? '').toString().toLowerCase();
      const isChild = CHILD_RELS.has(rel);
      const isItem = ITEM_RELS.has(rel);
      if (!isChild && !isItem) continue;

      const childSource = resolveHref(source, link.href);

      // Guardrail: cap the number of Items materialized as static pages per
      // parent so API-scale catalogs stay buildable. Child/subcatalog links are
      // always followed. Once the cap is reached, further *remote* Items are
      // deferred to lazy client-side loading (not fetched here) so builds stay
      // bounded and crawlers see only the capped set — but humans can still
      // browse them. Local Items are always materialized (a browser can't fetch
      // un-served local files, and local reads are cheap).
      if (isItem && itemCount >= itemCap && isHttp(childSource)) {
        const lazy: StacLazyChildRef = {href: childSource};
        if (typeof link.title === 'string') lazy.title = link.title;
        node.lazyChildren.push(lazy);
        continue;
      }

      const child = await visit(
        childSource,
        routePath,
        depth + 1,
        isItem ? 'item' : 'child',
      );
      if (child) {
        const ref: StacChildRef = {
          id: child.id,
          type: child.type,
          title: child.title,
          routePath: child.routePath,
        };
        node.children.push(ref);
        if (isItem) itemCount++;
      }
    }

    return node;
  }

  usedRoutePaths.add(routeBasePath);
  const root = await visit(rootSource, undefined, 0, undefined, routeBasePath);
  if (!root) {
    throw new Error(
      `docusaurus-plugin-stac: could not load root catalog at ${rootSource}`,
    );
  }

  return {root, nodes};
}
