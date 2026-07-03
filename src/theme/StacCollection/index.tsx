import React from 'react';
import Layout from '@theme/Layout';

import type {StacCollection as StacCollectionType, StacPageData} from '../../types.js';
import {
  AssetList,
  Breadcrumbs,
  ChildList,
  KeyValueTable,
  TypeBadge,
} from '../StacCommon/index.js';

export default function StacCollection({
  data,
}: {
  data: StacPageData;
}): React.JSX.Element {
  const {node, routeBasePath} = data;
  const stac = node.stac as StacCollectionType;

  const spatial = stac.extent?.spatial?.bbox?.[0];
  const temporal = stac.extent?.temporal?.interval?.[0];

  const summary: [string, unknown][] = [
    ['License', stac.license],
    ['Keywords', stac.keywords?.join(', ')],
    ['Spatial extent', spatial ? spatial.join(', ') : undefined],
    [
      'Temporal extent',
      temporal ? `${temporal[0] ?? '…'} — ${temporal[1] ?? '…'}` : undefined,
    ],
    [
      'Providers',
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

        <KeyValueTable caption="Collection metadata" entries={summary} />

        <AssetList assets={stac.assets} />

        <h2 className="stac-section-title">Items ({node.children.length})</h2>
        <ChildList children={node.children} />
      </main>
    </Layout>
  );
}
