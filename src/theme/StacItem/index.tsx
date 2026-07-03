import React from 'react';
import Layout from '@theme/Layout';
import Link from '@docusaurus/Link';

import type {StacItem as StacItemType, StacPageData} from '../../types.js';
import {
  AssetList,
  Breadcrumbs,
  KeyValueTable,
  TypeBadge,
} from '../StacCommon/index.js';
import StacMap from '../StacMap/index.js';

export default function StacItem({
  data,
}: {
  data: StacPageData;
}): React.JSX.Element {
  const {node, routeBasePath, map} = data;
  const stac = node.stac as StacItemType;
  const properties = stac.properties ?? {};

  const propertyEntries = Object.entries(properties) as [string, unknown][];

  return (
    <Layout title={node.title} description={String(properties.description ?? '')}>
      <main className="container margin-vert--lg stac-page">
        <Breadcrumbs node={node} routeBasePath={routeBasePath} />
        <header className="stac-header">
          <TypeBadge type={node.type} />
          <h1 className="stac-title">{node.title}</h1>
          <code className="stac-id">{node.id}</code>
          {stac.collection && (
            <span className="stac-collection-ref">
              in collection <code>{stac.collection}</code>
            </span>
          )}
        </header>

        <section className="stac-map-section">
          <StacMap node={node} map={map} />
        </section>

        <KeyValueTable
          caption="Properties"
          entries={propertyEntries}
        />

        <AssetList assets={stac.assets} />

        {node.parentRoutePath && (
          <p className="stac-parent-link">
            <Link to={node.parentRoutePath}>← Back to parent</Link>
          </p>
        )}
      </main>
    </Layout>
  );
}
