/**
 * Best-effort thumbnail/preview image discovery for a STAC object.
 *
 * STAC Browser (the reference Vue client this plugin complements — see the
 * README's "Explanation" section) surfaces a preview image for every
 * Catalog/Collection/Item that has one, both as a hero image on the record's
 * own page and as a small thumbnail next to its entry in a parent's child
 * list. This plugin generates fully static HTML (no client-side STAC
 * rendering), so that same convention has to be resolved once, at build time,
 * from the raw STAC JSON: prefer an asset explicitly keyed/`role`d as a
 * thumbnail or overview, then fall back to a `rel: "thumbnail"`/`"preview"`
 * link. This mirrors the lookup order the spec's own best-practices doc and
 * `stac-fields` (the field-rendering library STAC Browser itself uses) apply.
 */
import type {StacAsset, StacLink} from './types.js';

const THUMBNAIL_ASSET_KEYS = ['thumbnail', 'overview'];
const THUMBNAIL_ROLES = new Set(['thumbnail', 'overview']);
const THUMBNAIL_LINK_RELS = ['thumbnail', 'preview'];

export interface ThumbnailSource {
  assets?: Record<string, StacAsset>;
  links?: StacLink[];
}

/** Resolve the best-effort thumbnail/preview image href for a STAC object, if any. */
export function findThumbnailHref(stac: ThumbnailSource): string | undefined {
  const assets = stac.assets ?? {};

  // 1. An asset conventionally keyed `thumbnail`/`overview`.
  for (const key of THUMBNAIL_ASSET_KEYS) {
    const href = assets[key]?.href;
    if (typeof href === 'string') return href;
  }

  // 2. Any asset explicitly `role`d as a thumbnail/overview.
  for (const asset of Object.values(assets)) {
    if (!asset || typeof asset.href !== 'string') continue;
    const roles = Array.isArray(asset.roles) ? asset.roles : [];
    if (roles.some((r) => THUMBNAIL_ROLES.has(String(r).toLowerCase()))) {
      return asset.href;
    }
  }

  // 3. A `rel: "thumbnail"`/`"preview"` link (used by Catalogs, which have no
  // `assets` of their own, and by Collections/Items that prefer this form).
  const links = stac.links ?? [];
  for (const rel of THUMBNAIL_LINK_RELS) {
    const link = links.find(
      (l) => l && typeof l.href === 'string' && String(l.rel).toLowerCase() === rel,
    );
    if (link) return link.href;
  }

  return undefined;
}
