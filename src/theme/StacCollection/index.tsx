import React from 'react';
import Layout from '@theme/Layout';
import Translate, {translate} from '@docusaurus/Translate';

import type {StacCollection as StacCollectionType, StacPageData} from '../../types.js';
import {
  AssetList,
  Breadcrumbs,
  ChildList,
  KeyValueTable,
  LazyChildList,
  LicenseValue,
  SourceJsonLink,
  StacHead,
  Thumbnail,
  licenseLinks,
} from '../StacCommon/index.js';
import {PageHeader, PageShell} from '../StacCommon/PageLayout.js';
import {formatFieldValue} from '../../fields/registry.js';

export default function StacCollection({
  data,
}: {
  data: StacPageData;
}): React.JSX.Element {
  const {node, routeBasePath, itemsPerPage, sidebarEnabled, jsonHref, jsonLd} = data;
  const stac = node.stac as StacCollectionType;

  const spatial = stac.extent?.spatial?.bbox?.[0];
  const temporal = stac.extent?.temporal?.interval?.[0];
  // A null start/end bound is a normal, spec-sanctioned STAC value (open-ended
  // or ongoing collection) — render it as explicit wording instead of an
  // ambiguous "…" placeholder that reads like missing/broken data.
  const temporalText = (() => {
    if (!temporal) return undefined;
    const [start, end] = temporal;
    if (start == null && end == null) {
      return translate({
        id: 'stac.collection.temporal.unspecified',
        message: 'Not specified',
      });
    }
    const startText =
      start == null
        ? translate({id: 'stac.collection.temporal.openStart', message: 'Open start'})
        : formatFieldValue('datetime', start);
    const endText =
      end == null
        ? translate({id: 'stac.collection.temporal.ongoing', message: 'Present (ongoing)'})
        : formatFieldValue('datetime', end);
    return `${startText} — ${endText}`;
  })();

  const hasLicense = Boolean(stac.license) || licenseLinks(stac.links).length > 0;

  const summary: [string, unknown][] = [
    [
      translate({id: 'stac.collection.license', message: 'License'}),
      hasLicense ? <LicenseValue license={stac.license} links={stac.links} /> : undefined,
    ],
    [
      translate({id: 'stac.collection.keywords', message: 'Keywords'}),
      stac.keywords?.join(', '),
    ],
    [
      translate({id: 'stac.collection.spatial', message: 'Spatial extent'}),
      spatial ? spatial.join(', ') : undefined,
    ],
    [
      translate({id: 'stac.collection.temporal', message: 'Temporal extent'}),
      temporalText,
    ],
    [
      translate({id: 'stac.collection.providers', message: 'Providers'}),
      stac.providers?.map((p) => p.name).join(', '),
    ],
  ];

  return (
    <Layout title={node.title} description={stac.description}>
      <StacHead jsonHref={jsonHref} jsonLd={jsonLd} />
      <PageShell sidebarEnabled={sidebarEnabled} activeRoutePath={node.routePath}>
        <Breadcrumbs node={node} routeBasePath={routeBasePath} />
        <PageHeader node={node} />
        <SourceJsonLink jsonHref={jsonHref} />
        <Thumbnail stac={stac} alt={node.title} />
        {stac.description && <p className="stac-description">{stac.description}</p>}

        <KeyValueTable
          caption={translate({
            id: 'stac.collection.metadata',
            message: 'Collection metadata',
          })}
          entries={summary}
        />

        <AssetList assets={stac.assets} />

        <h2 className="stac-section-title">
          <Translate
            id="stac.collection.items"
            values={{count: node.children.length}}
          >
            {'Items ({count})'}
          </Translate>
        </h2>
        <ChildList children={node.children} itemsPerPage={itemsPerPage} />
        <LazyChildList lazyChildren={node.lazyChildren} batchSize={itemsPerPage} />
      </PageShell>
    </Layout>
  );
}
