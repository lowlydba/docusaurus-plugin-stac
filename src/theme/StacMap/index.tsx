import React, {useEffect, useRef} from 'react';
import BrowserOnly from '@docusaurus/BrowserOnly';

import type {NormalizedStacMapOptions, StacNode} from '../../types.js';
import {FootprintText, itemBbox} from '../StacCommon/index.js';

interface StacMapProps {
  node: StacNode;
  map: NormalizedStacMapOptions;
}

function footprintGeoJSON(node: StacNode, bbox: number[] | undefined): unknown {
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
 *   1. An explicit user `style` (URL or object) — used verbatim.
 *   2. A PMTiles archive — registered as a vector source with best-effort
 *      Overture-ish layers that render nothing if a source-layer is absent.
 *   3. A plain no-tiles background.
 */
function buildStyle(map: NormalizedStacMapOptions): Record<string, unknown> {
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

function MapImpl({node, map}: StacMapProps): React.JSX.Element {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const bbox = itemBbox(node);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return undefined;

    let mapInstance: {remove: () => void} | undefined;
    let cancelled = false;

    (async () => {
      const maplibregl: any = (await import('maplibre-gl')).default;
      await import('maplibre-gl/dist/maplibre-gl.css');

      if (map.pmtilesUrl) {
        const pmtiles: any = await import('pmtiles');
        const protocol = new pmtiles.Protocol();
        // Registering twice is harmless; MapLibre keeps the latest handler.
        maplibregl.addProtocol('pmtiles', protocol.tile);
      }

      if (cancelled || !containerRef.current) return;

      const style = buildStyle(map);
      const instance = new maplibregl.Map({
        container: containerRef.current,
        style,
        center: bbox ? [(bbox[0] + bbox[2]) / 2, (bbox[1] + bbox[3]) / 2] : [0, 0],
        zoom: bbox ? 4 : 1,
        attributionControl: true,
      });
      mapInstance = instance;
      instance.addControl(new maplibregl.NavigationControl(), 'top-right');

      instance.on('load', () => {
        instance.addSource('stac-footprint', {
          type: 'geojson',
          data: footprintGeoJSON(node, bbox),
        });
        const geomType = (node.stac as {geometry?: {type?: string}}).geometry
          ?.type;
        if (geomType === 'Point') {
          instance.addLayer({
            id: 'stac-footprint-point',
            type: 'circle',
            source: 'stac-footprint',
            paint: {
              'circle-radius': 6,
              'circle-color': map.footprintColor,
              'circle-stroke-width': 2,
              'circle-stroke-color': '#ffffff',
            },
          });
        } else {
          instance.addLayer({
            id: 'stac-footprint-fill',
            type: 'fill',
            source: 'stac-footprint',
            paint: {'fill-color': map.footprintColor, 'fill-opacity': 0.15},
          });
          instance.addLayer({
            id: 'stac-footprint-line',
            type: 'line',
            source: 'stac-footprint',
            paint: {'line-color': map.footprintColor, 'line-width': 2},
          });
        }

        if (bbox) {
          instance.fitBounds(
            [
              [bbox[0], bbox[1]],
              [bbox[2], bbox[3]],
            ],
            {padding: 40, duration: 0, maxZoom: 12},
          );
        }
      });
    })().catch((err) => {
      // eslint-disable-next-line no-console
      console.error('docusaurus-plugin-stac: map failed to initialize', err);
    });

    return () => {
      cancelled = true;
      if (mapInstance) mapInstance.remove();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div
      ref={containerRef}
      className="stac-map"
      style={{height: map.height}}
      role="img"
      aria-label={`Map showing the footprint of ${node.title}`}
    />
  );
}

export default function StacMap({node, map}: StacMapProps): React.JSX.Element | null {
  if (!map.enabled) {
    return <FootprintText bbox={itemBbox(node)} />;
  }
  return (
    <BrowserOnly fallback={<FootprintText bbox={itemBbox(node)} />}>
      {() => <MapImpl node={node} map={map} />}
    </BrowserOnly>
  );
}
