/**
 * Builds schema.org JSON-LD from STAC nodes so agents/search engines can consume
 * the generated pages as structured `Dataset` records. Pure and dependency-free
 * (no Docusaurus/React) so it is trivially unit-testable and runs at build time.
 */
import type {
  StacCollection,
  StacItem,
  StacNode,
  StacObject,
} from './types.js';
import {findThumbnailHref} from './thumbnail.js';

export interface DatasetUrls {
  /** Absolute (or root-relative) URL of the human HTML page. */
  pageUrl: string;
  /** Absolute (or root-relative) URL of the canonical STAC JSON. */
  jsonUrl: string;
}

interface DataDownload {
  '@type': 'DataDownload';
  contentUrl: string;
  name?: string;
  encodingFormat?: string;
}

export interface Dataset {
  '@context': 'https://schema.org';
  '@type': 'Dataset';
  name: string;
  identifier: string;
  url: string;
  description?: string;
  keywords?: string[];
  license?: string;
  /** Thumbnail/preview image href, if the node has one (see `thumbnail.ts`). */
  image?: string;
  dateCreated?: string;
  dateModified?: string;
  temporalCoverage?: string;
  spatialCoverage?: {
    '@type': 'Place';
    geo: {'@type': 'GeoShape'; box: string};
  };
  distribution: DataDownload[];
}

function bboxFrom(stac: StacObject): number[] | undefined {
  const withBbox = stac as {bbox?: number[]};
  if (Array.isArray(withBbox.bbox) && withBbox.bbox.length >= 4) {
    const b = withBbox.bbox;
    // Handle 6-element 3D bboxes ([w, s, minz, e, n, maxz]).
    return b.length >= 6 ? [b[0], b[1], b[3], b[4]] : b.slice(0, 4);
  }
  const coll = stac as StacCollection;
  const spatial = coll.extent?.spatial?.bbox?.[0];
  if (Array.isArray(spatial) && spatial.length >= 4) {
    return spatial.length >= 6
      ? [spatial[0], spatial[1], spatial[3], spatial[4]]
      : spatial.slice(0, 4);
  }
  return undefined;
}

/**
 * schema.org GeoShape `box` is `"<lat>,<lon> <lat>,<lon>"` (south-west corner
 * then north-east corner).
 */
function geoBox(bbox: number[]): string {
  const [w, s, e, n] = bbox;
  return `${s},${w} ${n},${e}`;
}

function temporalCoverage(stac: StacObject): string | undefined {
  const item = stac as StacItem;
  const props = item.properties ?? {};
  const dt = typeof props.datetime === 'string' ? props.datetime : undefined;
  const start =
    typeof props.start_datetime === 'string' ? props.start_datetime : undefined;
  const end =
    typeof props.end_datetime === 'string' ? props.end_datetime : undefined;
  if (start || end) return `${start ?? '..'}/${end ?? '..'}`;
  if (dt) return dt;

  const interval = (stac as StacCollection).extent?.temporal?.interval?.[0];
  if (Array.isArray(interval)) {
    const [s, e] = interval;
    if (s || e) return `${s ?? '..'}/${e ?? '..'}`;
  }
  return undefined;
}

function assetDownloads(stac: StacObject): DataDownload[] {
  const assets = (stac as StacItem).assets ?? {};
  return Object.entries(assets).map(([key, asset]) => {
    const dl: DataDownload = {
      '@type': 'DataDownload',
      contentUrl: asset.href,
    };
    if (asset.title ?? key) dl.name = asset.title ?? key;
    if (asset.type) dl.encodingFormat = asset.type;
    return dl;
  });
}

/** Build a schema.org `Dataset` object for a STAC node. */
export function buildDataset(node: StacNode, urls: DatasetUrls): Dataset {
  const stac = node.stac;
  const item = stac as StacItem;
  const coll = stac as StacCollection;
  const props = item.properties ?? {};

  const description =
    (typeof coll.description === 'string' && coll.description) ||
    (typeof props.description === 'string' && props.description) ||
    undefined;

  const dataset: Dataset = {
    '@context': 'https://schema.org',
    '@type': 'Dataset',
    name: node.title,
    identifier: node.id,
    url: urls.pageUrl,
    distribution: [
      {
        '@type': 'DataDownload',
        name: 'STAC JSON',
        encodingFormat: 'application/json',
        contentUrl: urls.jsonUrl,
      },
      ...assetDownloads(stac),
    ],
  };

  if (description) dataset.description = description;
  if (Array.isArray(coll.keywords) && coll.keywords.length > 0) {
    dataset.keywords = coll.keywords;
  }
  if (typeof coll.license === 'string') dataset.license = coll.license;
  if (typeof props.created === 'string') dataset.dateCreated = props.created;
  if (typeof props.updated === 'string') dataset.dateModified = props.updated;

  const thumbnailHref = findThumbnailHref(stac as {assets?: StacItem['assets']; links?: StacObject['links']});
  if (thumbnailHref) dataset.image = thumbnailHref;

  const temporal = temporalCoverage(stac);
  if (temporal) dataset.temporalCoverage = temporal;

  const bbox = bboxFrom(stac);
  if (bbox) {
    dataset.spatialCoverage = {
      '@type': 'Place',
      geo: {'@type': 'GeoShape', box: geoBox(bbox)},
    };
  }

  return dataset;
}
