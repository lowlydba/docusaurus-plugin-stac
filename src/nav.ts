import type {
  StacContent,
  StacNavNode,
  StacNode,
  StacSearchEntry,
} from './types.js';

/** Build the nested navigation tree (slim, no raw STAC payloads). */
export function buildNavTree(content: StacContent): StacNavNode {
  const byRoute = new Map<string, StacNode>();
  for (const n of content.nodes) byRoute.set(n.routePath, n);

  const seen = new Set<string>();
  function toNav(node: StacNode): StacNavNode {
    seen.add(node.routePath);
    return {
      id: node.id,
      type: node.type,
      title: node.title,
      routePath: node.routePath,
      children: node.children
        .map((c) => byRoute.get(c.routePath))
        .filter((n): n is StacNode => Boolean(n) && !seen.has(n!.routePath))
        .map(toNav),
    };
  }

  return toNav(content.root);
}

/** Build a flat search index across all nodes. */
export function buildSearchIndex(content: StacContent): StacSearchEntry[] {
  return content.nodes.map((node) => {
    const stac = node.stac as {
      description?: string;
      keywords?: string[];
      properties?: {datetime?: string | null};
    };
    const entry: StacSearchEntry = {
      id: node.id,
      type: node.type,
      title: node.title,
      routePath: node.routePath,
    };
    if (typeof stac.description === 'string' && stac.description) {
      entry.description = stac.description;
    }
    if (Array.isArray(stac.keywords) && stac.keywords.length > 0) {
      entry.keywords = stac.keywords;
    }
    const datetime = stac.properties?.datetime;
    if (typeof datetime === 'string' && datetime) {
      entry.datetime = datetime;
    }
    return entry;
  });
}

/** Case-insensitive substring search over the index (used client-side + tests). */
export function searchEntries(
  index: StacSearchEntry[],
  query: string,
): StacSearchEntry[] {
  const q = query.trim().toLowerCase();
  if (!q) return index;
  return index.filter((e) => {
    const haystack = [
      e.id,
      e.title,
      e.description ?? '',
      (e.keywords ?? []).join(' '),
      e.type,
    ]
      .join(' ')
      .toLowerCase();
    return haystack.includes(q);
  });
}
