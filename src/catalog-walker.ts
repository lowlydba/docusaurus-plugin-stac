import {promises as fs} from 'node:fs';
import path from 'node:path';
import {pathToFileURL} from 'node:url';

import type {
  StacChildRef,
  StacContent,
  StacNode,
  StacNodeType,
  StacObject,
} from './types.js';

const CHILD_RELS = new Set(['child']);
const ITEM_RELS = new Set(['item']);

function isHttp(href: string): boolean {
  return /^https?:\/\//i.test(href);
}

/** Read + parse a STAC object from a local path or http(s) URL. */
async function loadStac(source: string): Promise<StacObject> {
  let text: string;
  if (isHttp(source)) {
    const res = await fetch(source);
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
  // A "child" with no type and with sub-links is treated as a Catalog.
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
}

/**
 * Walk a static STAC catalog starting at `rootSource`, following `child` and
 * `item` links, and produce a flattened, route-assigned node tree.
 */
export async function walkCatalog(
  rootSource: string,
  {routeBasePath, maxDepth}: WalkOptions,
): Promise<StacContent> {
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

    const stac = await loadStac(source);
    const type = detectType(stac, relHint);
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
      stac,
    };
    nodes.push(node);

    if (depth >= maxDepth) {
      return node;
    }

    const links = Array.isArray(stac.links) ? stac.links : [];
    for (const link of links) {
      if (!link || typeof link.href !== 'string') continue;
      const rel = (link.rel ?? '').toString().toLowerCase();
      const isChild = CHILD_RELS.has(rel);
      const isItem = ITEM_RELS.has(rel);
      if (!isChild && !isItem) continue;

      const childSource = resolveHref(source, link.href);
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
