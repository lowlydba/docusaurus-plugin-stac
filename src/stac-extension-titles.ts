// AUTO-GENERATED — do not edit by hand.
// Source: @radiantearth/stac-fields@1.5.9 fields.json "extensions" map
// (Apache-2.0, https://github.com/stac-utils/stac-fields), the same
// field-metadata registry STAC Browser uses to render extension names.
// Regenerate with `npm run sync:extensions` after bumping that dependency.

export type StacExtensionSpec = string | {label: string; explain?: string};

/** Short field-name prefix (e.g. "eo", "proj") -> friendly title (+ optional
 * longer description). */
export const STAC_EXTENSION_TITLES: Record<string, StacExtensionSpec> =
{
  "alternate": "Alternative Access Methods",
  "anon": "Anonymized Location",
  "auth": "Authentication",
  "card4l": {
    "label": "CARD4L",
    "explain": "CEOS Analysis Ready Data for Land"
  },
  "ceosard": {
    "label": "CEOS-ARD",
    "explain": "CEOS Analysis Ready Data"
  },
  "cf": {
    "label": "CF Metadata Conventions",
    "explain": "Climate and Forecast Metadata Conventions"
  },
  "classification": "Classification",
  "contacts": "Contacts",
  "cube": "Data Cube",
  "esa_cci_lc": "ESA Climate Change Initiative - Land Cover",
  "eo": "Electro-Optical",
  "forecast": "Forecast",
  "file": "File",
  "grid": "Gridded Data",
  "goes": {
    "label": "NOAA GOES",
    "explain": "NOAA Geostationary Operational Environmental Satellite"
  },
  "label": "Labels / ML",
  "language": "Internationalization / Localization",
  "mgrs": {
    "label": "MGRS",
    "explain": "Military Grid Reference System"
  },
  "noaa_mrms_qpe": {
    "label": "NOAA MRMS QPE",
    "explain": "NOAA Multi-Radar Multi-Sensor Quantitative Precipitation Estimation"
  },
  "odc": "Open Data Cube",
  "order": "Order",
  "pc": "Point Cloud",
  "processing": "Processing",
  "product": "Product",
  "proj": "Projection",
  "raster": "Raster Imagery",
  "sar": {
    "label": "SAR",
    "explain": "Synthetic Aperture Radar"
  },
  "sat": "Satellite",
  "sci": "Scientific",
  "ssys": "Solar System",
  "stats": "STAC Statistics",
  "storage": "Cloud Storage",
  "table": "Tabular Data",
  "themes": "Themes",
  "tiles": "Tiled Assets",
  "view": "View Geometry",
  "web-map-links": "Web Maps",
  "xarray": "xarray",
  "gee": "Google Earth Engine",
  "landsat": "Landsat",
  "msft": "Microsoft",
  "openeo": "openEO",
  "pl": "Planet Labs PBC",
  "s2": "Sentinel-2",
  "sentinel": "Copernicus Sentinel",
  "cbers": {
    "label": "CBERS",
    "explain": "China-Brazil Earth Resources Satellite Program"
  },
  "geoadmin": {
    "label": "swisstopo",
    "explain": "Federal Office of Topography (Switzerland)"
  }
};
