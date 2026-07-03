/**
 * A small, dependency-free "stac-fields"-style registry that maps STAC and
 * common-extension property keys to human labels and formatted values (units,
 * dates, enums). Falls back to a generic prettifier for unknown keys so every
 * field still renders sensibly.
 */

export interface FieldDef {
  label: string;
  /** Optional custom formatter; receives the raw value. */
  format?: (value: unknown) => string;
}

const DEGREE = '\u00b0';

function fmtNumber(value: unknown, unit = ''): string {
  if (typeof value !== 'number' || Number.isNaN(value)) return String(value);
  const rounded = Math.round(value * 1000) / 1000;
  return `${rounded}${unit}`;
}

function fmtDate(value: unknown): string {
  if (typeof value !== 'string') return String(value);
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toISOString().replace('.000', '').replace('T', ' ').replace('Z', ' UTC');
}

function fmtList(value: unknown): string {
  if (Array.isArray(value)) return value.map((v) => String(v)).join(', ');
  return String(value);
}

function fmtBands(value: unknown): string {
  if (!Array.isArray(value)) return String(value);
  return value
    .map((b) => {
      if (b && typeof b === 'object') {
        const rec = b as Record<string, unknown>;
        return String(rec.common_name ?? rec.name ?? rec.description ?? 'band');
      }
      return String(b);
    })
    .join(', ');
}

/** Known extension prefixes → friendly group names (for fallback labels). */
const PREFIX_LABELS: Record<string, string> = {
  eo: 'EO',
  view: 'View',
  sar: 'SAR',
  sat: 'Satellite',
  proj: 'Projection',
  raster: 'Raster',
  sci: 'Scientific',
  ssys: 'SSYS',
  pc: 'Point Cloud',
  label: 'Label',
  processing: 'Processing',
  file: 'File',
  table: 'Table',
  mlm: 'ML Model',
};

const ACRONYMS = new Set([
  'eo',
  'sar',
  'gsd',
  'epsg',
  'utm',
  'crs',
  'id',
  'url',
  'uri',
  'doi',
  'ml',
]);

/** The explicit field registry (exact-key matches). */
export const FIELD_REGISTRY: Record<string, FieldDef> = {
  datetime: {label: 'Acquired', format: fmtDate},
  start_datetime: {label: 'Start', format: fmtDate},
  end_datetime: {label: 'End', format: fmtDate},
  created: {label: 'Created', format: fmtDate},
  updated: {label: 'Updated', format: fmtDate},
  title: {label: 'Title'},
  description: {label: 'Description'},
  license: {label: 'License'},
  platform: {label: 'Platform'},
  constellation: {label: 'Constellation'},
  mission: {label: 'Mission'},
  instruments: {label: 'Instruments', format: fmtList},
  gsd: {label: 'GSD', format: (v) => fmtNumber(v, ' m')},

  'eo:cloud_cover': {label: 'Cloud cover', format: (v) => fmtNumber(v, ' %')},
  'eo:snow_cover': {label: 'Snow cover', format: (v) => fmtNumber(v, ' %')},
  'eo:bands': {label: 'Bands', format: fmtBands},

  'view:off_nadir': {label: 'Off-nadir', format: (v) => fmtNumber(v, DEGREE)},
  'view:incidence_angle': {
    label: 'Incidence angle',
    format: (v) => fmtNumber(v, DEGREE),
  },
  'view:azimuth': {label: 'Azimuth', format: (v) => fmtNumber(v, DEGREE)},
  'view:sun_azimuth': {label: 'Sun azimuth', format: (v) => fmtNumber(v, DEGREE)},
  'view:sun_elevation': {
    label: 'Sun elevation',
    format: (v) => fmtNumber(v, DEGREE),
  },

  'proj:epsg': {label: 'EPSG code'},
  'proj:code': {label: 'CRS code'},

  'sat:orbit_state': {label: 'Orbit state'},
  'sat:relative_orbit': {label: 'Relative orbit'},
  'sat:absolute_orbit': {label: 'Absolute orbit'},

  'sar:instrument_mode': {label: 'Instrument mode'},
  'sar:frequency_band': {label: 'Frequency band'},
  'sar:polarizations': {label: 'Polarizations', format: fmtList},
  'sar:product_type': {label: 'Product type'},

  'sci:doi': {label: 'DOI'},
  'sci:citation': {label: 'Citation'},
};

function titleCaseWord(word: string): string {
  if (!word) return word;
  if (ACRONYMS.has(word.toLowerCase())) return word.toUpperCase();
  return word.charAt(0).toUpperCase() + word.slice(1);
}

/** Turn an arbitrary key like `eo:cloud_cover` into `EO cloud cover`. */
export function prettifyKey(key: string): string {
  const [maybePrefix, ...rest] = key.split(':');
  let prefixLabel = '';
  let body = key;
  if (rest.length > 0) {
    prefixLabel = PREFIX_LABELS[maybePrefix] ?? titleCaseWord(maybePrefix);
    body = rest.join(':');
  }
  const words = body
    .split(/[_\s]+/)
    .filter(Boolean)
    .map((w, i) => (i === 0 ? titleCaseWord(w) : w.toLowerCase()));
  const label = words.join(' ');
  return prefixLabel ? `${prefixLabel} ${label.toLowerCase()}` : label;
}

export function getFieldLabel(key: string): string {
  return FIELD_REGISTRY[key]?.label ?? prettifyKey(key);
}

export function formatFieldValue(key: string, value: unknown): string {
  if (value === null || value === undefined) return '\u2014';
  const def = FIELD_REGISTRY[key];
  if (def?.format) return def.format(value);
  if (typeof value === 'string') {
    // Auto-format ISO-8601 datetimes even for unregistered keys.
    if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(value)) return fmtDate(value);
    return value;
  }
  if (typeof value === 'number' || typeof value === 'boolean') {
    return String(value);
  }
  if (Array.isArray(value)) return fmtList(value);
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}

/** Convenience: build label/value triples for a property bag, in a stable order. */
export function formatProperties(
  properties: Record<string, unknown>,
): {key: string; label: string; value: string}[] {
  return Object.keys(properties).map((key) => ({
    key,
    label: getFieldLabel(key),
    value: formatFieldValue(key, properties[key]),
  }));
}
