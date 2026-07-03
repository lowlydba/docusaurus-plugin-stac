/**
 * Normalize STAC objects spanning the 0.6 – 1.1 version spread into a single
 * canonical internal shape the theme components can rely on.
 *
 * The main breaking differences we smooth over:
 *  - `type` was only added to Catalog/Collection/Item in 1.0 (Items became
 *    GeoJSON `Feature`s). Older objects omit it.
 *  - Collection `extent` changed from flat arrays (0.6–0.8) to the
 *    `{spatial:{bbox:[[]]}, temporal:{interval:[[]]}}` structure (0.9+/1.0).
 *  - `stac_version` may be missing entirely on very old objects.
 *  - Items may be missing a `properties` object or a `datetime`, and 3D bboxes
 *    ([w,s,minz,e,n,maxz]) appear alongside 2D ones.
 */
import type {StacExtent, StacNodeType, StacObject} from './types.js';
import {isPlainObject} from './utils.js';

/** Normalize a Collection `extent` from any known historical shape. */
export function normalizeExtent(extent: unknown): StacExtent | undefined {
  if (!isPlainObject(extent)) return undefined;
  const out: StacExtent = {};

  const spatial = extent.spatial;
  if (Array.isArray(spatial)) {
    // 0.6–0.8: spatial extent was a flat bbox array.
    out.spatial = {bbox: [spatial as number[]]};
  } else if (isPlainObject(spatial) && Array.isArray(spatial.bbox)) {
    const bbox = spatial.bbox as unknown[];
    // Guard against a single flat bbox where an array-of-arrays is expected.
    out.spatial = {
      bbox: (typeof bbox[0] === 'number'
        ? [bbox]
        : bbox) as number[][],
    };
  }

  const temporal = extent.temporal;
  if (Array.isArray(temporal)) {
    // 0.6–0.8: temporal extent was a flat [start, end] array.
    out.temporal = {interval: [temporal as (string | null)[]]};
  } else if (isPlainObject(temporal) && Array.isArray(temporal.interval)) {
    const interval = temporal.interval as unknown[];
    out.temporal = {
      interval: (typeof interval[0] === 'string' || interval[0] === null
        ? [interval]
        : interval) as (string | null)[][],
    };
  }

  return out.spatial || out.temporal ? out : undefined;
}

/** Normalize a bbox to 2D `[w, s, e, n]`, tolerating 3D input. */
export function normalizeBbox(bbox: unknown): number[] | undefined {
  if (!Array.isArray(bbox)) return undefined;
  const nums = bbox.filter((n): n is number => typeof n === 'number');
  if (nums.length >= 6) return [nums[0], nums[1], nums[3], nums[4]];
  if (nums.length >= 4) return [nums[0], nums[1], nums[2], nums[3]];
  return undefined;
}

/**
 * Return a canonicalized shallow copy of a STAC object. Never mutates the input.
 */
export function normalizeStacObject(
  raw: StacObject,
  type: StacNodeType,
): StacObject {
  const obj: Record<string, unknown> = {...(raw as Record<string, unknown>)};

  if (!obj.stac_version) obj.stac_version = '0.0.0';
  if (!Array.isArray(obj.links)) obj.links = [];

  if (type === 'Item') {
    obj.type = 'Feature';
    if (!isPlainObject(obj.properties)) obj.properties = {};
    if (obj.geometry === undefined) obj.geometry = null;
    const bbox = normalizeBbox(obj.bbox);
    if (bbox) obj.bbox = bbox;
  } else if (type === 'Collection') {
    obj.type = 'Collection';
    const extent = normalizeExtent(obj.extent);
    if (extent) obj.extent = extent;
    else delete obj.extent;
  } else {
    obj.type = 'Catalog';
  }

  return obj as StacObject;
}
