import type {NormalizedStacMapOptions, StacNode} from '../../types.js';

/** Build a GeoJSON Feature for a node's footprint (geometry or bbox polygon). */
export function footprintGeoJSON(
  node: StacNode,
  bbox: number[] | undefined,
): unknown {
  const geometry = (node.stac as {geometry?: unknown}).geometry;
  if (geometry && typeof geometry === 'object') {
    return {type: 'Feature', properties: {}, geometry};
  }
  if (bbox) {
    const [w, s, e, n] = bbox;
    return {
      type: 'Feature',
      properties: {},
      geometry: {
        type: 'Polygon',
        coordinates: [
          [
            [w, s],
            [e, s],
            [e, n],
            [w, n],
            [w, s],
          ],
        ],
      },
    };
  }
  return {type: 'FeatureCollection', features: []};
}

/**
 * Build a minimal MapLibre style. Precedence:
 *   1. An explicit user `style` object — used verbatim.
 *   2. A PMTiles archive — registered as a vector source with best-effort
 *      Overture-ish layers that render nothing if a source-layer is absent.
 *   3. A plain no-tiles background.
 */
export function buildStyle(
  map: NormalizedStacMapOptions,
): Record<string, unknown> {
  if (map.style && typeof map.style === 'object') {
    return map.style as Record<string, unknown>;
  }

  const background = {
    id: 'stac-background',
    type: 'background',
    paint: {'background-color': '#eef1f5'},
  };

  if (map.pmtilesUrl) {
    return {
      version: 8,
      glyphs: 'https://demotiles.maplibre.org/font/{fontstack}/{range}.pbf',
      sources: {
        basemap: {
          type: 'vector',
          url: `pmtiles://${map.pmtilesUrl}`,
          attribution:
            map.attribution ??
            '© <a href="https://overturemaps.org">Overture Maps Foundation</a>',
        },
      },
      layers: [
        background,
        {
          id: 'land',
          type: 'fill',
          source: 'basemap',
          'source-layer': 'land',
          paint: {'fill-color': '#e8ece4'},
        },
        {
          id: 'water',
          type: 'fill',
          source: 'basemap',
          'source-layer': 'water',
          paint: {'fill-color': '#a9c9e8'},
        },
        {
          id: 'roads',
          type: 'line',
          source: 'basemap',
          'source-layer': 'roads',
          paint: {'line-color': '#ffffff', 'line-width': 1},
        },
        {
          id: 'buildings',
          type: 'fill',
          source: 'basemap',
          'source-layer': 'buildings',
          paint: {'fill-color': '#d7d3cc'},
        },
      ],
    };
  }

  return {version: 8, sources: {}, layers: [background]};
}
