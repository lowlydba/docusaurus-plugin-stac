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
  TypeBadge,
} from '../StacCommon/index.js';
import {formatFieldValue} from '../../fields/registry.js';

export default function StacCollection({
  data,
}: {
  data: StacPageData;
}): React.JSX.Element {
  const {node, routeBasePath, itemsPerPage} = data;
  const stac = node.stac as StacCollectionType;

  const spatial = stac.extent?.spatial?.bbox?.[0];
  const temporal = stac.extent?.temporal?.interval?.[0];
  const fmtBound = (v: string | null | undefined): string =>
    v == null ? '…' : formatFieldValue('datetime', v);

  const summary: [string, unknown][] = [
    [translate({id: 'stac.collection.license', message: 'License'}), stac.license],
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
      temporal ? `${fmtBound(temporal[0])} — ${fmtBound(temporal[1])}` : undefined,
    ],
    [
      translate({id: 'stac.collection.providers', message: 'Providers'}),
      stac.providers?.map((p) => p.name).join(', '),
    ],
  ];

  return (
    <Layout title={node.title} description={stac.description}>
      <main className="container margin-vert--lg stac-page">
        <Breadcrumbs node={node} routeBasePath={routeBasePath} />
        <header className="stac-header">
          <TypeBadge type={node.type} />
          <h1 className="stac-title">{node.title}</h1>
          <code className="stac-id">{node.id}</code>
        </header>
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
      </main>
    </Layout>
  );
}
