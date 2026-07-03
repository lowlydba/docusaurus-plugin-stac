/**
 * Small, dependency-free helpers shared across the plugin's build-time code
 * (catalog walking, normalization) and its theme components.
 */

/** True for a non-null, non-array object — a nested structure, not a scalar. */
export function isPlainObject(
  value: unknown,
): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/** True for an absolute `http(s)://` URL (vs. a local filesystem path). */
export function isHttp(href: string): boolean {
  return /^https?:\/\//i.test(href);
}
