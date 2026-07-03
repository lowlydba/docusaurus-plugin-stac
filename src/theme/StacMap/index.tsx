import React, {useEffect, useRef} from 'react';
import BrowserOnly from '@docusaurus/BrowserOnly';

import type {NormalizedStacMapOptions, StacNode} from '../../types.js';
import {FootprintText, itemBbox} from '../StacCommon/index.js';
import {buildStyle, footprintGeoJSON} from './style.js';

interface StacMapProps {
  node: StacNode;
  map: NormalizedStacMapOptions;
}

function MapImpl({node, map}: StacMapProps): React.JSX.Element {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const bbox = itemBbox(node);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return undefined;

    let mapInstance: {remove: () => void} | undefined;
    let resizeObserver: ResizeObserver | undefined;
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
        // Large/near-global footprints (e.g. a division's bbox) fit at a very
        // low zoom, where MapLibre's default repeats the world side-by-side
        // to fill the viewport. A single footprint map never benefits from
        // that, so disable it — one world, clipped, reads far more cleanly.
        renderWorldCopies: false,
      });
      mapInstance = instance;
      instance.addControl(new maplibregl.NavigationControl(), 'top-right');

      // MapLibre measures its container once at construction time. Docusaurus
      // can still reflow the page after that (web fonts, hydration, sidebar
      // toggles), which otherwise leaves the canvas sized for a stale layout
      // and the footprint rendered off-center. Keep it in sync.
      if (typeof ResizeObserver !== 'undefined') {
        resizeObserver = new ResizeObserver(() => instance.resize());
        resizeObserver.observe(container);
      }

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
      if (resizeObserver) resizeObserver.disconnect();
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
